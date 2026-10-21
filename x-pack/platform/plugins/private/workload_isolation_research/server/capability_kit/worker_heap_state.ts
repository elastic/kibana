/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. The worker publishes its own V8 heap. The parent reads the packet.
 * It does not sample the parent and label it as the worker. */

export interface WorkerInventory {
  readonly bootMs: number | null;
  readonly ruleTypeIds: readonly string[];
  readonly actionTypeIds: readonly string[];
}

export interface WorkerHeapReport {
  readonly heapSizeLimit: number;
  readonly heapUsed: number;
  readonly heapTotal: number;
  readonly bootMs: number | null;
  readonly ruleTypeIds: readonly string[];
  readonly actionTypeIds: readonly string[];
}

const MAX_IDS = 500;

let inventory: WorkerInventory = { bootMs: null, ruleTypeIds: [], actionTypeIds: [] };
let publish: (() => void) | undefined;

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const idsOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').slice(0, MAX_IDS)
    : [];

/** Rejects a packet whose heap numbers are not finite. ISO duration strings stay out. */
export const acceptHeapPacket = (packet: {
  readonly heapSizeLimit?: unknown;
  readonly heapUsed?: unknown;
  readonly heapTotal?: unknown;
  readonly bootMs?: unknown;
  readonly ruleTypeIds?: unknown;
  readonly actionTypeIds?: unknown;
}): WorkerHeapReport | null => {
  if (!finite(packet.heapSizeLimit) || !finite(packet.heapUsed) || !finite(packet.heapTotal)) {
    return null;
  }
  return {
    heapSizeLimit: packet.heapSizeLimit,
    heapUsed: packet.heapUsed,
    heapTotal: packet.heapTotal,
    bootMs: finite(packet.bootMs) ? packet.bootMs : null,
    ruleTypeIds: idsOf(packet.ruleTypeIds),
    actionTypeIds: idsOf(packet.actionTypeIds),
  };
};

export const currentWorkerInventory = (): WorkerInventory => inventory;

/** Records rule and action ids from inside the worker, then asks for a heap packet. */
export const setWorkerInventory = (next: {
  readonly bootMs: number;
  readonly ruleTypeIds: readonly string[];
  readonly actionTypeIds: readonly string[];
}): void => {
  inventory = {
    bootMs: next.bootMs,
    ruleTypeIds: [...next.ruleTypeIds],
    actionTypeIds: [...next.actionTypeIds],
  };
  publish?.();
};

export const registerHeapPublisher = (fn: () => void): void => {
  publish = fn;
};
