/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import objectHash from 'object-hash';
import { BehaviorSubject, skip, type Subscription } from 'rxjs';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type {
  CellDefinition,
  CellType,
  ChartCellDefinition,
  CodeCellDefinition,
  CustomCellDefinition,
  VegaCellDefinition,
  EsqlCellDefinition,
  InputCellDefinition,
} from '../../common/types';
import { buildGraph, getAncestors, getDescendants, type NotebookGraph } from './graph';
import { getDefaultInputValue, type NotebookStore } from './notebook_store';
import { buildQueryParams, resolveInputParams } from './params';
import { getCodeReferences, runCode } from './code_cell';
import { getCellDisplayName, getCellOutputs, getOwnQuery } from './references';
import type {
  CellOutput,
  CellRuntime,
  CellStatus,
  InputValue,
  ParamMap,
  RunQuery,
  RunQueryArgs,
  RunQueryResult,
  StaleReason,
} from './types';

export interface SchedulerDeps {
  runQuery: RunQuery;
  now?: () => Date;
  /** Cells to keep up to date, along with everything upstream of them; every cell when omitted. */
  scope?: readonly string[];
}

/** Definition fields whose change re-evaluates a cell; everything else is metadata. */
const EXECUTION_FIELDS: {
  [T in CellType]: ReadonlyArray<keyof Extract<CellDefinition, { type: T }>>;
} = {
  esql: ['runMode'],
  chart: ['sourceCell', 'runMode'],
  custom: ['dataSource', 'sourceCell', 'runMode'],
  vega: ['sourceCell', 'runMode'],
  code: ['runMode'],
  input: ['input', 'name'],
  markdown: [],
};

const getExecutionKey = (cell: CellDefinition): string => {
  const fields: readonly string[] = EXECUTION_FIELDS[cell.type];
  return objectHash({
    type: cell.type,
    fields: Object.fromEntries(Object.entries(cell).filter(([key]) => fields.includes(key))),
  });
};

const RUNTIME_FIELDS = [
  'status',
  'output',
  'error',
  'staleReason',
  'lastRunAt',
  'durationMs',
  'memoKey',
  'runParams',
] as const satisfies ReadonlyArray<keyof CellRuntime>;

const isSameRuntime = (a: CellRuntime, b: CellRuntime): boolean =>
  RUNTIME_FIELDS.every((field) => a[field] === b[field]) &&
  isEqual(a.staleParents, b.staleParents) &&
  isEqual(a.changedParams, b.changedParams);

const withoutStatusDetails = ({
  error: _error,
  staleReason: _staleReason,
  staleParents: _staleParents,
  changedParams: _changedParams,
  ...runtime
}: CellRuntime): CellRuntime => runtime;

type StaleDetails = Pick<CellRuntime, 'staleParents' | 'changedParams'>;

const getChangedParams = (previous: ParamMap, next: ParamMap): string[] =>
  [...new Set([...Object.keys(previous), ...Object.keys(next)])].filter(
    (name) => previous[name] !== next[name]
  );

const isMemoHit = (runtime: CellRuntime, memoKey: string, forced: boolean): boolean =>
  !forced && runtime.output !== undefined && runtime.memoKey === memoKey;

const LONG_RUNNING_DELAY_MS = 10_000;

/** POC testing aid for long-running queries: ES|QL cells whose label contains `LONG` wait before querying. */
const getDebugDelayMs = (cell: CellDefinition | undefined): number =>
  cell?.label?.includes('LONG') ? LONG_RUNNING_DELAY_MS : 0;

const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });

const findColumn = ({ columns }: Datatable, columnName: string | null) =>
  columnName === null
    ? columns[0]
    : columns.find(({ id, name }) => id === columnName || name === columnName);

/** Distinct non-null values of `columnName`, or of the first column when it is null. */
const getOptions = (table: Datatable, columnName: string | null): string[] => {
  const column = findColumn(table, columnName);
  if (!column) return [];
  const { rows } = table;
  const values = rows.map((row) => row[column.id]);
  return [...new Set(values.filter((value) => value !== null && value !== undefined).map(String))];
};

/** Re-evaluates cells whose definitions, inputs or upstream outputs changed, in dependency order. */
export class NotebookScheduler {
  private readonly runQuery: RunQuery;
  private readonly now: () => Date;
  private cells: Readonly<Record<string, CellDefinition>>;
  private inputValues: Readonly<Record<string, InputValue>>;
  private graph: NotebookGraph;
  private readonly scope?: readonly string[];
  private inScope?: ReadonlySet<string>;
  private subscriptions: Subscription[] = [];
  private readonly tasks = new Map<string, Promise<void>>();
  private readonly controllers = new Map<string, AbortController>();
  private readonly editedCells = new Set<string>();
  /** How many times each cell has been recomputed rather than served from its memo. */
  readonly runCounts$ = new BehaviorSubject<Readonly<Record<string, number>>>({});

  constructor(private readonly store: NotebookStore, { runQuery, now, scope }: SchedulerDeps) {
    this.runQuery = runQuery;
    this.now = now ?? (() => new Date());
    this.scope = scope;
    this.cells = store.cells$.getValue();
    this.inputValues = store.inputValues$.getValue();
    this.graph = buildGraph(this.cells, store.cellOrder$.getValue());
    this.inScope = this.getInScope(this.graph);
  }

  start(): void {
    const { store } = this;
    this.subscriptions = [
      store.cells$.pipe(skip(1)).subscribe((cells) => this.onCellsChange(cells)),
      store.inputValues$.pipe(skip(1)).subscribe((values) => this.onInputValuesChange(values)),
    ];
    void this.propagate(this.graph.order, new Set());
  }

  runCell(id: string): Promise<void> {
    if (!this.graph.parents.has(id)) return Promise.resolve();
    this.editedCells.delete(id);
    return this.propagate([id], new Set([id]));
  }

  /**
   * Aborts the cell's in-flight run. It keeps its last output and is marked stale until run again,
   * so cells waiting on it go stale instead of running on that output.
   */
  stopCell(id: string): void {
    if (!this.controllers.has(id) || this.runtime(id).status !== 'running') return;
    this.markStale(id, 'stopped');
    this.cancel(id);
  }

  /** Flags an ES|QL cell whose editor holds an unrun query; it and its descendants stay stale until it is run. */
  markEdited(id: string, isEdited: boolean): void {
    if (this.editedCells.has(id) === isEdited || !this.graph.parents.has(id)) return;
    if (isEdited) this.editedCells.add(id);
    else this.editedCells.delete(id);
    void this.propagate([id], new Set());
  }

  runAll(): Promise<void> {
    const { order } = this.graph;
    return this.propagate(order, new Set(order));
  }

  /** Runs every cell currently in one of the given statuses, manual ones included, and what they feed. */
  runCellsWithStatus(statuses: readonly CellStatus[]): Promise<void> {
    const ids = this.graph.order.filter((id) => statuses.includes(this.runtime(id).status));
    return this.propagate(ids, new Set(ids));
  }

  /** Re-resolves the relative ranges of the given time inputs and re-runs what they feed. */
  refresh(ids: readonly string[]): Promise<void> {
    const timeInputs = this.graph.order.filter((id) => {
      const cell = this.cells[id];
      return ids.includes(id) && cell?.type === 'input' && cell.input.kind === 'time';
    });
    return this.propagate(timeInputs, new Set());
  }

  /** Runs an unsaved query against the current input values without publishing any results. */
  previewQuery(query: string, signal: AbortSignal): Promise<RunQueryResult> {
    const outputs = Object.keys(this.cells).map((id) => this.runtime(id).output);
    return this.run({ query, params: buildQueryParams(query, outputs), signal });
  }

  resetRunCounts(): void {
    this.runCounts$.next({});
  }

  async whenIdle(): Promise<void> {
    while (this.tasks.size > 0) {
      await Promise.all(this.tasks.values());
    }
  }

  stop(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions = [];
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
    this.tasks.clear();
  }

  private onCellsChange(cells: Readonly<Record<string, CellDefinition>>): void {
    const previousCells = this.cells;
    const previousErrors = this.graph.errors;
    this.cells = cells;
    this.graph = buildGraph(cells, this.store.cellOrder$.getValue());
    this.inScope = this.getInScope(this.graph);

    Object.keys(previousCells)
      .filter((id) => !cells[id])
      .forEach((id) => {
        this.cancel(id);
        this.editedCells.delete(id);
      });

    const roots = this.graph.order.filter((id) => {
      const before = previousCells[id];
      return (
        !before ||
        getExecutionKey(before) !== getExecutionKey(cells[id]) ||
        previousErrors.get(id) !== this.graph.errors.get(id)
      );
    });
    if (roots.length > 0) void this.propagate(roots, new Set());
  }

  private onInputValuesChange(values: Readonly<Record<string, InputValue>>): void {
    const previous = this.inputValues;
    this.inputValues = values;
    const roots = this.graph.order.filter(
      (id) => this.cells[id]?.type === 'input' && previous[id] !== values[id]
    );
    if (roots.length > 0) void this.propagate(roots, new Set());
  }

  private getInScope(graph: NotebookGraph): ReadonlySet<string> | undefined {
    const { scope } = this;
    return scope && new Set([...scope, ...getAncestors(graph, scope)]);
  }

  private cancel(id: string): void {
    this.controllers.get(id)?.abort();
    this.controllers.delete(id);
    this.tasks.delete(id);
  }

  /** Re-evaluates `roots` and everything downstream; each cell waits for its parents' latest evaluation. */
  private propagate(roots: readonly string[], forced: ReadonlySet<string>): Promise<void> {
    const affected = new Set([...roots, ...getDescendants(this.graph, roots)]);
    const { inScope } = this;
    const scheduled = this.graph.order
      .filter((id) => affected.has(id) && (!inScope || inScope.has(id)))
      .map((id) => {
        this.cancel(id);
        const controller = new AbortController();
        const { signal } = controller;
        const parentTasks = (this.graph.parents.get(id) ?? []).map((parent) =>
          this.tasks.get(parent)
        );
        const task = Promise.all(parentTasks)
          .then(() => this.evaluate(id, forced.has(id), signal))
          .catch((error: unknown) => this.fail(id, error, signal))
          .finally(() => {
            if (this.tasks.get(id) === task) this.tasks.delete(id);
            if (this.controllers.get(id) === controller) this.controllers.delete(id);
          });
        this.controllers.set(id, controller);
        this.tasks.set(id, task);
        return task;
      });
    return Promise.all(scheduled).then(() => undefined);
  }

  private async evaluate(id: string, forced: boolean, signal: AbortSignal): Promise<void> {
    const cell = this.cells[id];
    if (signal.aborted || !cell || cell.type === 'markdown') return;

    const validationError = this.graph.errors.get(id);
    if (validationError) {
      this.publish(id, {
        ...withoutStatusDetails(this.runtime(id)),
        status: 'error',
        error: validationError,
      });
      return;
    }
    const parents = this.parents(id);
    const parentStatuses = parents.map((parent) => this.runtime(parent).status);
    if (parentStatuses.some((status) => status === 'error' || status === 'blocked')) {
      this.setStatus(id, 'blocked');
      return;
    }
    const staleParents = parents.filter((_parent, index) => parentStatuses[index] === 'stale');
    if (staleParents.length > 0) {
      const changedParams = [
        ...new Set(staleParents.flatMap((parent) => this.runtime(parent).changedParams ?? [])),
      ];
      this.markStale(id, 'upstream', { staleParents, changedParams });
      return;
    }

    switch (cell.type) {
      case 'esql':
        return this.evaluateEsql(cell, forced, signal);
      case 'custom': {
        const query = getOwnQuery(cell);
        return query === undefined
          ? this.evaluateSourced(cell, forced)
          : this.evaluateEsql({ ...cell, query }, forced, signal);
      }
      case 'chart':
      case 'vega':
        return this.evaluateSourced(cell, forced);
      case 'code':
        return this.evaluateCode(cell, forced, signal);
      case 'input':
        return this.evaluateInput(cell, forced, signal);
    }
  }

  private async evaluateEsql(
    { id, query, runMode }: Pick<EsqlCellDefinition, 'id' | 'query' | 'runMode'>,
    forced: boolean,
    signal: AbortSignal
  ): Promise<void> {
    if (!query.trim()) {
      this.publish(id, { status: 'idle' });
      return;
    }
    if (this.editedCells.has(id)) {
      this.markStale(id, 'edited');
      return;
    }
    const params = buildQueryParams(query, this.parentOutputs(id));
    const memoKey = objectHash({ query, params });
    if (isMemoHit(this.runtime(id), memoKey, forced)) {
      this.setStatus(id, 'done');
      return;
    }
    if (runMode === 'manual' && !forced) {
      const { runParams } = this.runtime(id);
      this.markStale(
        id,
        'manual',
        runParams && { changedParams: getChangedParams(runParams, params) }
      );
      return;
    }
    this.countRun(id);
    this.setStatus(id, 'running');
    await sleep(getDebugDelayMs(this.cells[id]), signal);
    const { table, truncated, durationMs } = await this.run({ query, params, signal });
    if (signal.aborted) return;
    this.publish(id, {
      status: 'done',
      output: { kind: 'table', table, truncated },
      memoKey,
      runParams: params,
      lastRunAt: this.now().getTime(),
      durationMs,
    });
  }

  private async evaluateCode(
    { id, code, runMode }: CodeCellDefinition,
    forced: boolean,
    signal: AbortSignal
  ): Promise<void> {
    if (!code.trim()) {
      this.publish(id, { status: 'idle' });
      return;
    }
    if (this.editedCells.has(id)) {
      this.markStale(id, 'edited');
      return;
    }
    const parents = this.parents(id);
    const memoKey = objectHash({
      code,
      parents: parents.map((parent) =>
        this.cells[parent]?.type === 'input'
          ? this.inputValues[parent] ?? null
          : this.runtime(parent).memoKey ?? null
      ),
    });
    if (isMemoHit(this.runtime(id), memoKey, forced)) {
      this.setStatus(id, 'done');
      return;
    }
    if (runMode === 'manual' && !forced) {
      this.markStale(id, 'manual');
      return;
    }
    this.countRun(id);
    this.setStatus(id, 'running');
    const { values, logs, error, durationMs } = await runCode({
      code,
      inputs: this.getCodeInputs(code, parents),
      signal,
    });
    if (signal.aborted) return;
    this.publish(id, {
      status: error ? 'error' : 'done',
      error,
      output: { kind: 'code', values, logs },
      memoKey: error ? undefined : memoKey,
      lastRunAt: this.now().getTime(),
      durationMs,
    });
  }

  /**
   * The parent outputs a code cell reads, by name: input values, code exports, and ES|QL results
   * as arrays of row objects keyed by column name.
   */
  private getCodeInputs(code: string, parents: readonly string[]): Record<string, unknown> {
    const referenced = new Set(getCodeReferences(code));
    const available = parents.flatMap((parentId): Array<[string, unknown]> => {
      const { output } = this.runtime(parentId);
      const parent = this.cells[parentId];
      if (!output || !parent) return [];
      switch (output.kind) {
        case 'input':
          return Object.entries(output.params);
        case 'code':
          return Object.entries(output.values);
        case 'table': {
          const name = getCellOutputs(parent).find(({ key }) => key === 'table')?.name;
          const { columns, rows } = output.table;
          const records = rows.map((row) =>
            Object.fromEntries(columns.map((column) => [column.name, row[column.id]]))
          );
          return name ? [[name, records]] : [];
        }
      }
    });
    return Object.fromEntries(available.filter(([name]) => referenced.has(name)));
  }

  /** Charts, custom and Vega cells take their source cell's table as their own output. */
  private evaluateSourced(
    { id, sourceCell, runMode }: ChartCellDefinition | CustomCellDefinition | VegaCellDefinition,
    forced: boolean
  ): void {
    const source = sourceCell === null ? undefined : this.runtime(sourceCell);
    const sourceOutput = source?.output;
    const runtime = this.runtime(id);
    if (!source || !sourceOutput || sourceCell === null) {
      this.publish(id, { status: 'idle' });
      return;
    }
    if (runtime.output === sourceOutput && !forced) {
      this.setStatus(id, 'done');
      return;
    }
    if (runMode === 'manual' && !forced) {
      const { output, runParams } = runtime;
      this.markStale(
        id,
        'manual',
        output && {
          staleParents: [sourceCell],
          changedParams: runParams ? getChangedParams(runParams, source.runParams ?? {}) : [],
        }
      );
      return;
    }
    this.countRun(id);
    this.publish(id, {
      status: 'done',
      output: sourceOutput,
      runParams: source.runParams,
      lastRunAt: this.now().getTime(),
    });
  }

  private async evaluateInput(
    cell: InputCellDefinition,
    forced: boolean,
    signal: AbortSignal
  ): Promise<void> {
    const { id, input } = cell;
    const runtime = this.runtime(id);
    const value = this.inputValues[id] ?? getDefaultInputValue(input);
    const params = resolveInputParams(cell, value, this.now());

    if (input.kind !== 'dropdown') {
      const memoKey = objectHash(params);
      if (isMemoHit(runtime, memoKey, forced)) {
        this.setStatus(id, 'done');
        return;
      }
      this.countRun(id);
      this.publish(id, { status: 'done', output: { kind: 'input', params }, memoKey });
      return;
    }

    if (input.optionsSource === 'cell') {
      const { optionsCell = null, optionsColumn = null } = input;
      const source = optionsCell === null ? undefined : this.runtime(optionsCell).output;
      const table = source?.kind === 'table' ? source.table : undefined;
      if (table && optionsColumn !== null && !findColumn(table, optionsColumn)) {
        const sourceCell = optionsCell === null ? undefined : this.cells[optionsCell];
        const sourceName = sourceCell ? getCellDisplayName(sourceCell) : '';
        this.publish(id, {
          status: 'error',
          error: `Column "${optionsColumn}" is not in the results of "${sourceName}"`,
        });
        return;
      }
      const options = table ? getOptions(table, optionsColumn) : [];
      this.publishOptions(id, params, options, forced);
      return;
    }

    if (input.optionsSource === 'static') {
      this.publishOptions(id, params, [...new Set(input.staticOptions ?? [])], forced);
      return;
    }

    const { optionsQuery, optionsColumn = null } = input;
    const queryParams = buildQueryParams(optionsQuery, this.parentOutputs(id));
    const memoKey = objectHash({ optionsQuery, optionsColumn, params: queryParams });
    const previous = runtime.output?.kind === 'input' ? runtime.output : undefined;
    if (previous && isMemoHit(runtime, memoKey, forced)) {
      const output =
        objectHash(previous.params) === objectHash(params) ? previous : { ...previous, params };
      this.publish(id, { ...withoutStatusDetails(runtime), status: 'done', output });
      return;
    }

    if (!optionsQuery.trim()) {
      this.countRun(id);
      this.publish(id, { status: 'done', output: { kind: 'input', params, options: [] }, memoKey });
      return;
    }
    this.countRun(id);
    this.setStatus(id, 'running');
    const { table, durationMs } = await this.run({
      query: optionsQuery,
      params: queryParams,
      signal,
    });
    if (signal.aborted) return;
    const columns = table.columns.map(({ name }) => name);
    if (optionsColumn !== null && !findColumn(table, optionsColumn)) {
      this.publish(id, {
        status: 'error',
        output: { kind: 'input', params, options: [], columns },
        error: `Column "${optionsColumn}" is not in the results of the options query`,
      });
      return;
    }
    this.publish(id, {
      status: 'done',
      output: { kind: 'input', params, options: getOptions(table, optionsColumn), columns },
      memoKey,
      lastRunAt: this.now().getTime(),
      durationMs,
    });
  }

  /** Publishes dropdown options that need no query of their own. */
  private publishOptions(id: string, params: ParamMap, options: string[], forced: boolean): void {
    const memoKey = objectHash({ options, params });
    if (isMemoHit(this.runtime(id), memoKey, forced)) {
      this.setStatus(id, 'done');
      return;
    }
    this.countRun(id);
    this.publish(id, { status: 'done', output: { kind: 'input', params, options }, memoKey });
  }

  /** Runs a query, rejecting as soon as the evaluation is aborted so a superseded run never settles it. */
  private run(args: RunQueryArgs): Promise<RunQueryResult> {
    const { signal } = args;
    return new Promise((resolve, reject) => {
      const onAbort = () => reject(signal.reason);
      signal.addEventListener('abort', onAbort, { once: true });
      this.runQuery(args)
        .then(resolve, reject)
        .finally(() => signal.removeEventListener('abort', onAbort));
    });
  }

  private fail(id: string, error: unknown, signal: AbortSignal): void {
    if (signal.aborted) return;
    this.publish(id, {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  private runtime(id: string): CellRuntime {
    return this.store.getRuntime(id);
  }

  private parents(id: string): readonly string[] {
    return this.graph.parents.get(id) ?? [];
  }

  private parentOutputs(id: string): Array<CellOutput | undefined> {
    return this.parents(id).map((parent) => this.runtime(parent).output);
  }

  private countRun(id: string): void {
    const counts = this.runCounts$.getValue();
    this.runCounts$.next({ ...counts, [id]: (counts[id] ?? 0) + 1 });
  }

  private setStatus(id: string, status: CellStatus): void {
    this.publish(id, { ...withoutStatusDetails(this.runtime(id)), status });
  }

  private markStale(id: string, staleReason: StaleReason, details?: StaleDetails): void {
    this.publish(id, {
      ...withoutStatusDetails(this.runtime(id)),
      status: 'stale',
      staleReason,
      ...details,
    });
  }

  private publish(id: string, runtime: CellRuntime): void {
    if (!this.cells[id] || isSameRuntime(this.runtime(id), runtime)) return;
    this.store.setRuntime(id, runtime);
  }
}
