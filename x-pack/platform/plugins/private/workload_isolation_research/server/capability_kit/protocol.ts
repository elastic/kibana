/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WireValue, CodecInput } from './codecs';

export const PROTOCOL_VERSION = 1 as const;
export const GENERIC_LEVERS = [
  'co_locate',
  'replicate',
  'module_specifier',
  'capability_bundle',
  'sync_proxy',
  'codec',
] as const;
export type Lever =
  | (typeof GENERIC_LEVERS)[number]
  | 'async_api'
  | 'owner_refactor'
  | 'elasticsearch';
export const LEVER_LABELS = {
  co_locate: 'Co-locate callee code with the runner',
  replicate: 'Replicate read-mostly data (snapshot + invalidation)',
  module_specifier: 'Module-specifier loading of contributed code',
  capability_bundle: 'Per-run capability bundle',
  sync_proxy: 'Worker→main sync proxy (`Atomics.wait`; main never waits on a worker)',
  codec: 'Codecs for class instances/config objects',
  elasticsearch: 'Push into Elasticsearch',
  async_api: 'Async-ify an API (contract change)',
  owner_refactor: 'Refactor/rewrite in owning plugin',
} as const;

export interface ModuleDescriptor {
  readonly id: string;
  readonly specifier: string;
  readonly exportName: string;
  readonly revision: number;
}
export interface Bundle {
  readonly runId: string;
  readonly principal: string;
  readonly space: string;
  readonly grants: Readonly<Record<string, string>>;
  readonly data?: WireValue;
}
export interface RegistrySnapshot {
  readonly revision: number;
  readonly modules: readonly ModuleDescriptor[];
}
export interface Crossing {
  readonly runId: string;
  readonly edge: string;
  readonly lever: (typeof LEVER_LABELS)[Lever];
  readonly generic: boolean;
  readonly direction: 'host_to_isolate' | 'isolate_to_host';
  readonly bytes: number;
  readonly durationMs: number;
  readonly handlerSyncCpuUs?: number;
  readonly handlerWindowCpuUs?: number;
}
export interface CallbackRef {
  readonly owner: 'worker';
  readonly runId: string;
  readonly id: string;
  readonly $asyncHandle: 1;
}
export type AsyncCallback = (...args: CodecInput[]) => CodecInput | Promise<CodecInput>;
export interface HostCallContext {
  invokeCallback(reference: CallbackRef, args: readonly CodecInput[]): Promise<CodecInput>;
  /** 0.1.10: main-side signal for this run; aborts once the run has ended (outcome or hard stop). */
  readonly signal?: AbortSignal;
}
export type TerminationReason = 'deadline' | 'cancelled' | 'shutdown' | 'stall' | 'crash';
/** Why the worker signal aborted; `original` is the host AbortSignal.reason when it was codec-safe. */
export interface CancellationInfo {
  readonly reason: Exclude<TerminationReason, 'crash'>;
  readonly hasOriginalReason: boolean;
}
export interface WorkerContext {
  readonly bundle: Bundle;
  readonly signal: AbortSignal;
  /** 0.1.9: category of the cooperative abort (undefined until aborted). */
  readonly cancellation?: () => CancellationInfo | undefined;
  call(capability: string, operation: string, args: CodecInput): Promise<CodecInput>;
  callSync(
    capability: string,
    operation: string,
    args: CodecInput,
    options?: { timeoutMs?: number; maxReplyBytes?: number }
  ): CodecInput;
  load(id: string): Promise<object>;
  exportCallback(callback: AsyncCallback): CallbackRef;
  releaseCallback(reference: CallbackRef): void;
  resolveCallback(reference: CallbackRef): AsyncCallback;
}
export type TaskEntry = (input: CodecInput, context: WorkerContext) => Promise<CodecInput>;
export type HostHandler = (
  operation: string,
  args: CodecInput,
  bundle: Bundle,
  context?: HostCallContext
) => Promise<CodecInput>;
export type Packet =
  | {
      readonly version: 1;
      readonly kind: 'run';
      readonly bundle: Bundle;
      readonly input: WireValue;
      readonly moduleId: string;
      readonly registry: RegistrySnapshot;
      /** 0.1.9: requested worker event-loop heartbeat interval (stall watchdog). */
      readonly heartbeatMs?: number;
    }
  | {
      readonly version: 1;
      readonly kind: 'call';
      readonly runId: string;
      readonly id: number;
      readonly capability: string;
      readonly grant: string;
      readonly operation: string;
      readonly args: WireValue;
    }
  | {
      readonly version: 1;
      readonly kind: 'reply';
      readonly runId: string;
      readonly id: number;
      readonly value: WireValue;
      readonly failed: boolean;
    }
  | {
      readonly version: 1;
      readonly kind: 'outcome';
      readonly runId: string;
      readonly value: WireValue;
      readonly failed: boolean;
      readonly heapUsed: number;
      readonly rss: number;
    }
  | {
      readonly version: 1;
      readonly kind: 'cancel';
      readonly runId: string;
      readonly reason: Exclude<TerminationReason, 'crash'>;
      /** 0.1.9: codec-encoded host AbortSignal.reason (absent for the default AbortError). */
      readonly original?: WireValue;
    }
  | { readonly version: 1; readonly kind: 'abort_ack'; readonly runId: string }
  | { readonly version: 1; readonly kind: 'heartbeat' }
  /** 0.1.12: task module loaded, user code starting (stall watchdog arms here, not at dispatch). */
  | { readonly version: 1; readonly kind: 'started'; readonly runId: string }
  | {
      readonly version: 1;
      readonly kind: 'callback';
      readonly runId: string;
      readonly id: number;
      readonly reference: CallbackRef;
      readonly args: WireValue;
    }
  | {
      readonly version: 1;
      readonly kind: 'callback_result';
      readonly runId: string;
      readonly id: number;
      readonly value: WireValue;
      readonly failed: boolean;
    }
  | {
      readonly version: 1;
      readonly kind: 'sync_call';
      readonly runId: string;
      readonly capability: string;
      readonly grant: string;
      readonly operation: string;
      readonly args: WireValue;
      readonly state: SharedArrayBuffer;
      readonly buffer: SharedArrayBuffer;
    }
  | { readonly version: 1; readonly kind: 'ready' };

export type Outcome =
  | {
      readonly status: 'success';
      readonly value: CodecInput;
      readonly heapUsed: number;
      readonly rss: number;
    }
  | { readonly status: 'failure'; readonly error: Error }
  | {
      readonly status: 'terminated';
      /** 'stall' only occurs when the run opted into RunOptions.stallMs. */
      readonly reason: TerminationReason;
      readonly graceful?: boolean;
      readonly terminal?: CodecInput;
      readonly collateral?: boolean;
      readonly initiatingRunId?: string;
      readonly discardedRunIds?: readonly string[];
    };
