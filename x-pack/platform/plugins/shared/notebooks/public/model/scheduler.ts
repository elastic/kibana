/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import objectHash from 'object-hash';
import { skip, type Subscription } from 'rxjs';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type {
  CellDefinition,
  CellType,
  ChartCellDefinition,
  EsqlCellDefinition,
  InputCellDefinition,
} from '../../common/types';
import { buildGraph, getDescendants, type NotebookGraph } from './graph';
import { getDefaultInputValue, type NotebookStore } from './notebook_store';
import { buildQueryParams, resolveInputParams } from './params';
import type {
  CellOutput,
  CellRuntime,
  CellStatus,
  InputValue,
  RunQuery,
  RunQueryArgs,
  RunQueryResult,
  StaleReason,
} from './types';

export interface SchedulerDeps {
  runQuery: RunQuery;
  now?: () => Date;
}

/** Definition fields whose change re-evaluates a cell; everything else is metadata. */
const EXECUTION_FIELDS: {
  [T in CellType]: ReadonlyArray<keyof Extract<CellDefinition, { type: T }>>;
} = {
  esql: ['runMode'],
  chart: ['sourceCell', 'runMode'],
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
] as const satisfies ReadonlyArray<keyof CellRuntime>;

const isSameRuntime = (a: CellRuntime, b: CellRuntime): boolean =>
  RUNTIME_FIELDS.every((field) => a[field] === b[field]) && isEqual(a.staleParents, b.staleParents);

const withoutStatusDetails = ({
  error: _error,
  staleReason: _staleReason,
  staleParents: _staleParents,
  ...runtime
}: CellRuntime): CellRuntime => runtime;

const isMemoHit = (runtime: CellRuntime, memoKey: string, forced: boolean): boolean =>
  !forced && runtime.output !== undefined && runtime.memoKey === memoKey;

const getOptions = ({ columns, rows }: Datatable): string[] => {
  const [first] = columns;
  if (!first) return [];
  const values = rows.map((row) => row[first.id]);
  return [...new Set(values.filter((value) => value !== null && value !== undefined).map(String))];
};

/** Re-evaluates cells whose definitions, inputs or upstream outputs changed, in dependency order. */
export class NotebookScheduler {
  private readonly runQuery: RunQuery;
  private readonly now: () => Date;
  private cells: Readonly<Record<string, CellDefinition>>;
  private inputValues: Readonly<Record<string, InputValue>>;
  private graph: NotebookGraph;
  private subscriptions: Subscription[] = [];
  private readonly tasks = new Map<string, Promise<void>>();
  private readonly controllers = new Map<string, AbortController>();
  private readonly editedCells = new Set<string>();

  constructor(private readonly store: NotebookStore, { runQuery, now }: SchedulerDeps) {
    this.runQuery = runQuery;
    this.now = now ?? (() => new Date());
    this.cells = store.cells$.getValue();
    this.inputValues = store.inputValues$.getValue();
    this.graph = buildGraph(this.cells, store.cellOrder$.getValue());
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

  refresh(): Promise<void> {
    const timeInputs = this.graph.order.filter((id) => {
      const cell = this.cells[id];
      return cell?.type === 'input' && cell.input.kind === 'time';
    });
    return this.propagate(timeInputs, new Set());
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

  private cancel(id: string): void {
    this.controllers.get(id)?.abort();
    this.controllers.delete(id);
    this.tasks.delete(id);
  }

  /** Re-evaluates `roots` and everything downstream; each cell waits for its parents' latest evaluation. */
  private propagate(roots: readonly string[], forced: ReadonlySet<string>): Promise<void> {
    const affected = new Set([...roots, ...getDescendants(this.graph, roots)]);
    const scheduled = this.graph.order
      .filter((id) => affected.has(id))
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
      this.markStale(id, 'upstream', staleParents);
      return;
    }

    switch (cell.type) {
      case 'esql':
        return this.evaluateEsql(cell, forced, signal);
      case 'chart':
        return this.evaluateChart(cell, forced);
      case 'input':
        return this.evaluateInput(cell, forced, signal);
    }
  }

  private async evaluateEsql(
    { id, query, runMode }: EsqlCellDefinition,
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
      this.markStale(id, 'manual');
      return;
    }
    this.setStatus(id, 'running');
    const { table, truncated, durationMs } = await this.run({ query, params, signal });
    if (signal.aborted) return;
    this.publish(id, {
      status: 'done',
      output: { kind: 'table', table, truncated },
      memoKey,
      lastRunAt: this.now().getTime(),
      durationMs,
    });
  }

  private evaluateChart({ id, sourceCell, runMode }: ChartCellDefinition, forced: boolean): void {
    const sourceOutput = sourceCell === null ? undefined : this.runtime(sourceCell).output;
    const runtime = this.runtime(id);
    if (!sourceOutput) {
      this.publish(id, { status: 'idle' });
      return;
    }
    if (runtime.output === sourceOutput && !forced) {
      this.setStatus(id, 'done');
      return;
    }
    if (runMode === 'manual' && !forced) {
      this.markStale(id, 'manual');
      return;
    }
    this.publish(id, { status: 'done', output: sourceOutput, lastRunAt: this.now().getTime() });
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
      this.publish(id, { status: 'done', output: { kind: 'input', params }, memoKey });
      return;
    }

    const { optionsQuery } = input;
    const queryParams = buildQueryParams(optionsQuery, this.parentOutputs(id));
    const memoKey = objectHash({ optionsQuery, params: queryParams });
    const previous = runtime.output?.kind === 'input' ? runtime.output : undefined;
    if (previous && isMemoHit(runtime, memoKey, forced)) {
      const output =
        objectHash(previous.params) === objectHash(params) ? previous : { ...previous, params };
      this.publish(id, { ...withoutStatusDetails(runtime), status: 'done', output });
      return;
    }

    if (!optionsQuery.trim()) {
      this.publish(id, { status: 'done', output: { kind: 'input', params, options: [] }, memoKey });
      return;
    }
    this.setStatus(id, 'running');
    const { table, durationMs } = await this.run({
      query: optionsQuery,
      params: queryParams,
      signal,
    });
    if (signal.aborted) return;
    this.publish(id, {
      status: 'done',
      output: { kind: 'input', params, options: getOptions(table) },
      memoKey,
      lastRunAt: this.now().getTime(),
      durationMs,
    });
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

  private setStatus(id: string, status: CellStatus): void {
    this.publish(id, { ...withoutStatusDetails(this.runtime(id)), status });
  }

  private markStale(id: string, staleReason: StaleReason, staleParents?: readonly string[]): void {
    this.publish(id, {
      ...withoutStatusDetails(this.runtime(id)),
      status: 'stale',
      staleReason,
      ...(staleParents && { staleParents }),
    });
  }

  private publish(id: string, runtime: CellRuntime): void {
    if (!this.cells[id] || isSameRuntime(this.runtime(id), runtime)) return;
    this.store.setRuntime(id, runtime);
  }
}
