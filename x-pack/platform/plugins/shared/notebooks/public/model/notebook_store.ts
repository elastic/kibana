/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map, type Observable } from 'rxjs';
import type { CellDefinition, InputDefinition, NotebookAttributes } from '../../common/types';
import { createPinnedTimeCell, findPinnedTimeCell } from './cell_factory';
import type { CellRuntime, InputValue } from './types';

const IDLE: CellRuntime = { status: 'idle' };

export const getDefaultInputValue = (input: InputDefinition): InputValue => {
  switch (input.kind) {
    case 'time':
      return { kind: 'time', range: input.defaultValue };
    case 'dropdown':
      return { kind: 'dropdown', value: input.defaultValue };
    case 'range':
      return { kind: 'range', value: input.defaultValue };
  }
};

const hashAttributes = (attributes: NotebookAttributes): string => objectHash(attributes);

/** Holds a notebook's definitions, current input values and per-cell runtime state, outside React. */
export class NotebookStore {
  readonly title$: BehaviorSubject<string>;
  readonly description$: BehaviorSubject<string | undefined>;
  readonly cellOrder$: BehaviorSubject<string[]>;
  readonly cells$: BehaviorSubject<Record<string, CellDefinition>>;
  readonly inputValues$: BehaviorSubject<Record<string, InputValue>>;
  readonly isDirty$: Observable<boolean>;

  private readonly runtimes = new Map<string, BehaviorSubject<CellRuntime>>();
  private readonly savedHash$: BehaviorSubject<string>;

  constructor(attributes: NotebookAttributes) {
    this.title$ = new BehaviorSubject(attributes.title);
    this.description$ = new BehaviorSubject(attributes.description);
    this.cellOrder$ = new BehaviorSubject(attributes.cellOrder);
    this.cells$ = new BehaviorSubject(attributes.cells);
    this.inputValues$ = new BehaviorSubject(
      Object.fromEntries(
        Object.values(attributes.cells).flatMap((cell) =>
          cell.type === 'input' ? [[cell.id, getDefaultInputValue(cell.input)]] : []
        )
      )
    );
    this.savedHash$ = new BehaviorSubject(hashAttributes(this.toAttributes()));
    this.isDirty$ = combineLatest([
      this.title$,
      this.description$,
      this.cellOrder$,
      this.cells$,
      this.savedHash$,
    ]).pipe(
      map(([, , , , savedHash]) => hashAttributes(this.toAttributes()) !== savedHash),
      distinctUntilChanged()
    );
  }

  getCell(id: string): CellDefinition | undefined {
    return this.cells$.getValue()[id];
  }

  getRuntime$(id: string): BehaviorSubject<CellRuntime> {
    let runtime$ = this.runtimes.get(id);
    if (!runtime$) {
      runtime$ = new BehaviorSubject<CellRuntime>(IDLE);
      this.runtimes.set(id, runtime$);
    }
    return runtime$;
  }

  getRuntime(id: string): CellRuntime {
    return this.getRuntime$(id).getValue();
  }

  setRuntime(id: string, runtime: CellRuntime): void {
    this.getRuntime$(id).next(runtime);
  }

  setTitle(title: string): void {
    this.title$.next(title);
  }

  updateCell(id: string, update: (cell: CellDefinition) => CellDefinition): void {
    const cells = this.cells$.getValue();
    const cell = cells[id];
    if (!cell) return;
    const next = update(cell);
    if (next.type === 'input' && cell.type === 'input' && next.input.kind !== cell.input.kind) {
      this.setInputValue(id, getDefaultInputValue(next.input));
    }
    this.cells$.next({ ...cells, [id]: next });
  }

  addCell(cell: CellDefinition, index = this.cellOrder$.getValue().length): void {
    if (cell.type === 'input') {
      this.setInputValue(cell.id, getDefaultInputValue(cell.input));
    }
    const order = [...this.cellOrder$.getValue()];
    order.splice(index, 0, cell.id);
    this.cellOrder$.next(order);
    this.cells$.next({ ...this.cells$.getValue(), [cell.id]: cell });
  }

  removeCell(id: string): void {
    const { [id]: _removed, ...cells } = this.cells$.getValue();
    this.cellOrder$.next(this.cellOrder$.getValue().filter((cellId) => cellId !== id));
    this.cells$.next(cells);
    const { [id]: _value, ...inputValues } = this.inputValues$.getValue();
    this.inputValues$.next(inputValues);
    this.runtimes.get(id)?.complete();
    this.runtimes.delete(id);
  }

  moveCell(id: string, offset: -1 | 1): void {
    const order = [...this.cellOrder$.getValue()];
    const from = order.indexOf(id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    this.cellOrder$.next(order);
  }

  /** Adds or removes the pinned time cell that backs the header time picker. */
  setGlobalTimePicker(enabled: boolean): void {
    const pinned = findPinnedTimeCell(this.cells$.getValue());
    if (enabled && !pinned) this.addCell(createPinnedTimeCell(this.cells$.getValue()), 0);
    if (!enabled && pinned) this.removeCell(pinned.id);
  }

  setInputValue(id: string, value: InputValue): void {
    this.inputValues$.next({ ...this.inputValues$.getValue(), [id]: value });
  }

  toAttributes(): NotebookAttributes {
    const description = this.description$.getValue();
    return {
      title: this.title$.getValue(),
      ...(description ? { description } : {}),
      cellOrder: this.cellOrder$.getValue(),
      cells: this.cells$.getValue(),
    };
  }

  markSaved(): void {
    this.savedHash$.next(hashAttributes(this.toAttributes()));
  }
}
