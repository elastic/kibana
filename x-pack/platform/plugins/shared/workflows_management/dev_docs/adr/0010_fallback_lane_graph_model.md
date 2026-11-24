
# ADR-0010 — Fallback lane graph model

**Status:** Accepted
**Date:** 2026-09-18
**Deciders:** @elastic/workflows-eng

## Context

Spec 02 renders `on-failure.fallback` steps as a side column (the *fallback lane*) hung off the
step that owns them. Seven concrete questions were left open in the spec and resolved here.

## Decisions

### 1. Lane = one out-edge of the fork, not "child slot"

A fallback owner is treated as a fork with two out-edges: the *spine edge* (to the next step) and
the *failure edge* (to the lane head). The spine edge is not a child slot — it is the owner's
continuation in the parent sequence — but the lane machinery treats both edges symmetrically.
Definition updated in `CONTEXT.md`.

### 2. Asymmetric lane sets for the failure/spine pair

> **⚠️ Decision 2 superseded by ADR-0012.** The reserved-lane model filters out failure edges
> (`!e.isFailure && !e.isRejoin`) before `buildLaneSets` runs, so failure targets never enter
> the lane-set builder. The `failureHead` parameter no longer exists on `buildLaneSets`. The
> rest of ADR-0010 (decisions 1, 3–8) remains in force.

In the fallback lane with `continue: true`, the lane leaves rejoin the spine, so the spine head is
reachable from the failure lane. Without special handling, `buildLaneSets` classifies the spine head
as a join → spine lane is empty → the fork is skipped (measured: the lane stays wherever dagre put
it, which is the −cross side).

Fix (original): `buildLaneSets` gained a `failureHead` parameter. A node shared between the failure
lane and the spine lane belongs to the **spine** lane, not to "no lane". Gated on the fork having a
failure edge so `if`/`switch`/`parallel` behaviour is untouched.

### 3. Edge declaration order encodes lane side

Dagre's ordering phase is barycentre-based, not insertion-ordered. Measured: dagre puts the fallback
lane on the −cross side regardless of edge declaration order (`nested-fails` x=0 vs `if-step` x=314
in the reported YAML). `transformInternal` emits structural edges before failure edges per graph
boundary — the post-dagre packing reads this as declaration order `[spine, failure]` and enforces
spine on the left (TB) / top (LR) regardless of what dagre produced.

### 4. Failure edge routing: `buildFailureLanePath`, not the fork bus

The failure edge exits the owner's bottom (or right) handle via a short trunk, then turns
horizontally (TB) or vertically (LR) to reach the lane head's column, then descends to the lane
head. Unlike `buildForkBusPath`, this path is never shared with a sibling edge. The failure edge
carries `isFailure: true` in `WorkflowEdgeData`; `computeEdgePath` dispatches on this flag before
the fork-bus and merge-bus checks.

Decision 4 from the original spec ("failure edge shares the fork bus") is superseded. The shared
trunk required `isFork` on the spine edge to maintain routing consistency; that flag is now removed.

### 5. `fallbackOf` stamping: innermost owner wins

`transformInternal` stamps `fallbackOf = id` on all nodes in `inner.nodes` and in each
`inner.foreachGroup.innerNodes`. For nested fallbacks, the innermost recursion stamps first; the
outer loop's `if (n.data.fallbackOf === undefined)` guard prevents overwriting. This makes
`laneNodesByOwner` correct for both the inner and outer owner.

### 6. Failure edges are separate per graph boundary

`transformInternal` returns `failureEdges` separately from `edges`. The two graph-level boundaries
(the outer graph in `transformWorkflowToGraph` and each `foreachGroup` body) concatenate
`[...edges, ...failureEdges]`. All other call sites forward `inner.failureEdges` to the parent's
`failureEdges` bucket. This ensures `[all structural edges, all failure edges]` is the edge order
per graph, which the packing pass reads as declaration order.

### 7. Failure handle

Step nodes have a second source handle, `id="failure"`, at the bottom-right corner. It is `opacity:
0` in the current implementation; the visible red port is spec 07's. React Flow uses this handle's
coordinates as `sourceX/sourceY` when `sourceHandle="failure"` is set on the failure edge, giving
`buildFailureLanePath` the correct exit point.

### 8. Dagre does not respect edge declaration order for lane side

Earlier reasoning assumed that emitting failure edges last would place the lane on the +cross side.
Measured: dagre puts the fallback lane on the −cross side regardless. The post-dagre packing pass
enforces order; dagre's output is corrected, not relied on.

### 9. Failure edge traversal colour

`isFailure: true` edges render always-dashed. Colour transitions from `borderBaseProminent` (grey)
to `danger` (red) once any node in the fallback lane has a step-execution record (i.e. the lane has
started running). The whole lane is probed, not just the head, because guards (`if:`) on lane steps
mean the head may never run even if a later step did.

## Alternatives considered

**Single failure handle (bottom-centre, same as spine).** Simpler, but `buildFailureLanePath`
would exit from the midpoint of the owner, producing a visual conflict with the spine edge also
exiting from the same midpoint. The dedicated `id="failure"` handle at bottom-right eliminates the
visual conflict without any node-width arithmetic in the path builder.

**Failure edge shares the fork bus (`buildForkBusPath`).** Requires `isFork` on the spine edge to
maintain routing consistency; the spine edge then renders as a bus when it should render straight.
Superseded by decision 4.
