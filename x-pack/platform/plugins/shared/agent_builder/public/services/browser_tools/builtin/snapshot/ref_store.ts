/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KEPT_GENERATIONS } from './constants';

interface ElementHandle {
  deref(): Element | undefined;
}

const holdElement = (element: Element): ElementHandle =>
  typeof WeakRef === 'function' ? new WeakRef(element) : { deref: () => element };

const REF_PATTERN = /^s(\d+)e(\d+)$/;

/**
 * Maps generation-qualified element refs (`s<generation>e<n>`) to the elements they were
 * assigned to. Only the last {@link KEPT_GENERATIONS} generations stay resolvable.
 */
export class RefStore {
  private generation = 0;
  private readonly generations = new Map<number, ElementHandle[]>();

  /** Starts a new snapshot generation, evicts the old ones and returns the new generation. */
  beginGeneration(): number {
    this.generation++;
    this.generations.set(this.generation, []);
    for (const gen of this.generations.keys()) {
      if (gen <= this.generation - KEPT_GENERATIONS) {
        this.generations.delete(gen);
      }
    }
    return this.generation;
  }

  assign(generation: number, element: Element): string {
    const handles = this.generations.get(generation);
    if (!handles) {
      throw new Error(`Snapshot generation ${generation} is not active`);
    }
    handles.push(holdElement(element));
    return `s${generation}e${handles.length}`;
  }

  /** Returns the element for a ref, or undefined when unknown, evicted or no longer in the document. */
  resolve(ref: string): Element | undefined {
    const match = REF_PATTERN.exec(ref);
    if (!match) {
      return undefined;
    }
    const element = this.generations.get(Number(match[1]))?.[Number(match[2]) - 1]?.deref();
    return element?.isConnected ? element : undefined;
  }
}

let refStore: RefStore | undefined;

export const getRefStore = (): RefStore => {
  if (!refStore) {
    refStore = new RefStore();
  }
  return refStore;
};
