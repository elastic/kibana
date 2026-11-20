# RFC: Step IO

**Status:** Implemented on `eviction_rehydration_workflows`
**Authors:** Workflows Engine Team
**Date:** 2026-11-18

---

## Problem

A workflow execution holds every step input and output in the Kibana process. Outputs stay reachable for the rest of the run because later steps read them through `steps.<id>.output` and `variables`. On a long run, or after a resume, that set is the execution's heap.

The previous design tried to bound that heap with a background eviction loop, pins for loop sources, and a planner that decided what to fetch back from Elasticsearch. The pieces existed to answer one question: which outputs must be in memory before this node reads, and which can be dropped. Pins, deferred release, and the 500 ms eviction tick made that answer race. A value could be evicted after the plan and before the read. The read then rendered blank.

## Decision

Each execution owns a byte-bounded LRU of step outputs. Elasticsearch remains the durable copy. A node does not read the LRU directly. Before the node reads, the engine loads the step IO that node needs, freezes it into a snapshot, and serves that snapshot until the node is done.

The default cache budget is 10 MB (`eviction.maxCacheSize`). An output is stored in the LRU only when it is at most 20% of that budget. A larger output is still returned for the current read and held on the snapshot until the node finishes. It is not kept for a later node. `eviction.minPayloadSize` is ignored. A deployment that still sets it gets a deprecation warning and the value is removed. Output retention is `eviction.maxCacheSize`.

### Accessibility-keyed LRU

Durable identity remains the step-execution id (`executionId`). The LRU is an accessibility cache: callers pass a `contextId` built as `buildStepIoContextId(stepId, scopeStack)` — the step name plus parallel branch lineage, without foreach/while/retry attempt ids. Sequential loop iterations therefore share one cache slot; concurrent parallel branches do not.

`StepIoService` does not invent `contextId`. It is a dumb router: state by `executionId`, LRU key composed as `type` + `contextId` (e.g. `output:${contextId}`). Entries are stamped with `executionId` so a hit is valid only for that execution. This revision admits outputs only; typing the key leaves room to cache inputs later. Removing `WorkflowExecutionState` from the service is a later change.

Read order is live state, then stamped cache, then Elasticsearch. An unflushed write in the live map always wins over the LRU.

## Contract

### What is durable

`StepIoService.write({ executionId, contextId, type, value, sizeBytes? })` records input and output on the execution state, which flushes them to Elasticsearch. Only outputs are admitted to the LRU.

After a flush confirms, the live map drops the output, except a `data.set` output. A finished step's input is dropped. A step that is still running keeps its input, so a foreach or dynamic parallel can read `input.items` on the next iteration. A `data.set` output stays in the live map because later nodes read it as `variables`.

On resume, step documents are loaded without `output`. Unfinished inputs are loaded (open loops still need `input.items`). Outputs come back only when a later read asks for them.

### What a node reads

`prepareContext` decides the refs (`executionId` + `contextId` from each target execution’s own `stepId` + `scopeStack`), fetches **outputs** with one `readBatch({ type: 'output', refs })`, builds the snapshot, and drops the batch. `releaseContext` drops the snapshot. A normal node does this around the node run. A parallel branch does it around that branch. A `retry` or `continue` condition prepares the failed step's context with the condition string included, because that string is not on the failed node.

The batch is the only output fetch. The snapshot is the only value the render sees. A synchronous read does not consult the LRU and does not call Elasticsearch. Predecessor `steps.<id>.input` is not part of the public step context (`StepDataSchema` is output + error only); open-loop foreach reads its own input from the live map.

The target steps come from static analysis of the node and, when a handler passes one, of the condition:

- A named `steps.<id>` reference is fetched (for output / error).
- An ambiguous reference, such as `steps[variables.name]`, fetches every predecessor.
- An analysis result that names nothing fetches nothing. There is no fallback that reloads every predecessor.
- `variables` reads also fetch every `data.set` output. A node that does not read `variables` does not.

A quoted `steps["producer"]` reference is not recognized. The scanner keeps the bracket form and the id extractor only matches the `steps.` prefix. That miss exists on the previous design as well. This design does not paper over it by reloading every predecessor.

### When the cache and the snapshot disagree

The LRU can evict during a batch. Inserting one output can push another out of the cache before the batch returns. The returned map still contains every output this call needs:

- A value that was already resident is copied before the fetch.
- A value this call inserts is recorded in the map as it is inserted.
- A value a sibling cached while this fetch was in flight is copied before any later insert in this batch. That cached copy is kept when a flush has already removed a newer write from state and Elasticsearch still has the older document.
- A write that is still in state wins over both the cache and the document.

`prepareContext` copies those objects onto the snapshot and then drops the map. The snapshot holds them until `releaseContext`. The LRU keeps an output only while it fits. Releasing the snapshot does not remove it from the LRU.

Overlapping reads of the same output can each hold the document they received until each snapshot is released. A read that copied the cached object shares that one object.

### Rendering

`getContext` returns the snapshot. A narrowed render of `steps.<id>` reads that snapshot. A narrowed render of `variables` does too, including after `setInput` bumps the step IO version. Recomputing `variables` from state at that point would miss `data.set` outputs, because a resume never put them in the live map.

Inside `foreach`, `while`, `if`, and `retry`, narrowing is skipped and the full snapshot is used.

## What this removes

The background eviction loop, read pins, loop-source pins, and deferred release are gone. Eviction happens when an insert exceeds the byte budget, or when a flush drops a value from the live map. There is no tick that can evict a value between the plan and the read.

## What this does not change

`data.set` outputs are still retained for the run and are not subject to the LRU budget. A later design should read variables through the same step IO path. That work is tracked in [elastic/security-team#20970](https://github.com/elastic/security-team/issues/20970).

Older executions that stored a foreach or dynamic-parallel expression without the evaluated `items` list still re-evaluate that expression. New runs store `items` on the loop step's input.

## Consequences

A node pays an Elasticsearch read for the outputs its templates name, unless those values are still in the LRU or the live map. A node that names no steps pays nothing. A node whose template cannot be analyzed pays for every predecessor.

The heap bound for ordinary outputs is the cache budget plus the snapshots of the nodes that are running. A parallel fan-out holds one snapshot per in-flight branch. `data.set` outputs sit outside that budget.
