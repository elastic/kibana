# Workflow Visual Builder — current state of implementation

This document describes what is **currently implemented** in the workflow graph authoring surface. It is updated in the PR that changes the behaviour it describes. The PR description (the spec itself) is the record of intent; this document is the record of outcome; [`adr/`](adr/README.md) holds the decisions.

---

## What exists today

The workflow graph is an **authoring surface** for the workflow YAML, behind the
`workflows:experimentalFeatures` setting. With the setting off, the same graph is a read-only view
(see [Gate: `canEdit`](#gate-canedit)).

- Nodes render steps, triggers and `if`/`switch`/`parallel`/`foreach`/`while` control-flow blocks.
  Edges render the execution path, with a virtual join node after every `if`/`switch`/`parallel`.
- **Insert**: `+` controls on wires and at dangling exits, an add-trigger `+`, an empty-state "Add
  trigger" card, and ⌘K / Ctrl+K for "add a step at the end". Choosing an action writes a default
  step into the YAML and opens its configuration panel.
- **Edit**: clicking a node opens a floating configuration panel (Form and YAML tabs). Every valid
  edit is written to the YAML as you type; there is no Done or Cancel.
- **Delete**: the `⋮` menu or the Delete key, with a 10 second Undo in the toast.
- **Failure handling**: a failure port on eligible steps adds an `on-failure.fallback` lane;
  "Continue on failure" and retry live in the step panel.
- **Workflow settings**: a flyout for name, description, tags, execution limits, constants and
  outputs.
- **Undo**: ⌘Z / Ctrl+Z on the canvas delegates to the main Monaco editor's undo stack. There is no
  redo gesture.
- Execution runs colour nodes and edges from `stepExecutions`.
- There is no drag-to-connect: `nodesConnectable={false}` and there is no `onConnect`.

## Authoring capabilities

| Capability | Status | Spec | ADR |
|---|---|---|---|
| Shared step-child traversal (prerequisite) | ✅ Implemented | 00 | ADR-0007 (supersedes ADR-0003) |
| Fork and trigger lane order preserved after layout | ✅ Implemented | 01 | ADR-0013 (the end of the chain ADR-0008 → ADR-0011 → ADR-0012) |
| Fallback lane graph model | ✅ Implemented | 02 | ADR-0004, ADR-0010, ADR-0012 |
| Connection ports | ✅ Implemented, in a different shape: one node-anchored **failure port** (revealed on hover or focus) and a red dot once a fallback exists. Flow and branch insertion use wire and terminal `+` controls instead of node-anchored ports | 03 | ADR-0001 |
| Insert step | ✅ Implemented for every insertion mode; committed synchronously | 04 | ADR-0002, ADR-0005, ADR-0015 |
| Node action menu | 🟡 Partial: **Edit** and **Delete** only. No Duplicate, no "Add fallback" item (the failure port does that) | 05 | — |
| Add trigger | ✅ Implemented (ghost `+`, empty-state card, trigger menu, trigger panel) | 06 | — |
| Fallback authoring | ✅ Implemented. The `continue` switch ("Continue on failure") is in the step panel, not on the canvas | 07 | ADR-0004 |
| Pending node and insert animation | ✅ Implemented (ghost card, 300 ms slide, 900 ms flash; a `requestAnimationFrame` tween, not FLIP) | 08 | ADR-0002 |
| Step configuration panel (Form and YAML, live-apply) | ✅ Implemented | — | — |
| Data references (picker, catalog, last-run samples) | ✅ Implemented | — | — |
| Trigger configuration panel | ✅ Implemented | — | — |
| Workflow settings flyout | ✅ Implemented | — | — |
| One lazy boundary per heavy surface | ✅ Implemented | — | ADR-0014 |

### Insertion

`WorkflowGraphInsertionContext` (`workflow_graph_actions_context.tsx`) has five modes, each mapped to
one mutation in [`yaml_mutations.ts`](../public/features/workflow_visual_editor/lib/yaml_mutations.ts):

| Mode | Address | Mutation |
|---|---|---|
| `trigger` | — | `appendTrigger` |
| `prepend-step` | — | `prependStep` |
| `after` | `stepName` | `insertStepAfterName` (into the anchor's containing sequence, after the whole block when the anchor is a block) |
| `branch` | `stepName`, a `BranchSlot`, optional `position` (`start` or `end`, default `end`) | `insertStepIntoBranch` |
| `fallback` | `stepName` | `setStepFallback` (writes `on-failure.fallback: [step]`, replaces an existing fallback, never writes `continue`) |

Controls are computed by `computeWireInsertionControls` and drawn by `WorkflowGraphEditOverlays`:

- **Wire controls** (`wire:*`, `terminal:fork:*`, `terminal:branch-tail:*`) appear on hover or focus
  of a hit strip along a wire: a plain sequential edge, a fork head (inserts at the start of that
  branch), a branch tail, and the join into the next step (inserts after the fork block).
- **Terminal controls** (`terminal:*`) are always-visible dashed stubs at every dangling exit: the
  last step, an empty branch, the exit of the last fork block, the last step of a terminating
  fallback lane, and triggers that have no step yet.
- Several triggers share one `+` (`wire:trigger-fanin:*`, `terminal:trigger-join`).
- An empty `foreach` or `while` body has its own "add first step" `+`.

Clicking a control opens the actions menu (`ActionsMenuPopover`, an `EuiModal`), filtered by mode:
triggers only for `trigger`, no triggers for steps, and neither triggers nor Flow control for a
fallback. A Manual trigger is hidden once one exists. **Nothing is written until an action is
chosen.** The chosen action becomes a default step (`buildDefaultStep`: name `<type>_step`, made
unique, required fields prefilled), is written with `applyYamlEdit`, and its panel opens with origin
`insert`, with the new node selected and flashed.

### Failure port eligibility

`stepSupportsErrorHandling` excludes `if`, `foreach`, `parallel`, `while` and `atomic` (a TODO: "once
the engine permits it"), and triggers. Steps inside a fallback lane can have their own failure port,
so fallbacks nest. The step panel's Error handling section is hidden for steps that are themselves
inside a fallback lane.

### Step configuration panel

`step_config_panel.tsx`, in `canvas_config_panel_shell.tsx` (a floating panel in the graph region).

- **Shell**: width 400 by default, minimum 360, persisted in `localStorage` as
  `workflows:configPanelWidth`; resized by pointer drag (committed on release) or by keyboard on the
  separator (← → ±16 px, Shift ±64, Home/End). Focus moves into the panel when it opens. Role
  `region`, "Configuration panel".
- **Tabs**: Form, and YAML (a Monaco editor on the step fragment, with full-workflow validation and
  autocomplete attached).
- **Form sections**: Inputs, and Advanced (conditional execution `if`, timeout, error handling).
  `if` and `timeout` are not offered for steps directly inside a `parallel` body. The Advanced
  accordion state is kept by the shell across steps.
- **Name**: edited inline in the header; empty and duplicate names are rejected.
- **Field kinds** (`StepFieldKind`): text, number, boolean, select, connector-id, code (json, kuery,
  plaintext, esql, json-liquid), key-value, list, variants, switch-cases, parallel-branches. Most
  reference-capable fields have a Fixed / Data toggle.
- **Live-apply**: every valid draft is reported to the stateful editor, which skips unchanged,
  unparsable, empty-name and name-colliding drafts and otherwise calls `replaceStepFragment`.
  Structural changes (name, type, child-container keys) flush immediately; other edits ride the
  typing debounce. A step rename also rewrites `steps.<old>` and `steps["<old>"]` references in
  every string value in the same write.
- **Footer**: for an inserted step, **Remove node** restores the pre-insert YAML (if it is still
  the last write; otherwise it deletes the step). For an existing step, **Reset node** restores the
  fragment the panel opened with.
- **Read-only** (when `canEdit` is false): inert form, read-only YAML tab, plain name, no Remove or
  Reset; the footer offers "Open in YAML" and, if the user may run it, "Run step".

### Data references

`buildDataReferenceCatalog` builds the groups the picker shows: **Step context** (first, only when
the step has loop or variable scope), **Trigger event** (manual inputs appear under it), **Steps**
(earlier steps in document order), and **Workflow context** (consts, workflow, execution, `kibanaUrl`,
`now`). The picker is a search popover, or a typeahead when `{{` is typed; the expanded editor uses
a tree. A reference is inserted by click, Enter or Space, or by drag (`text/plain` with `{{ path }}`).
References render as chips at rest. Last-run samples come from "Test this step", "Run full
workflow" and the latest execution.

### Trigger configuration panel

Same shell, Form and YAML tabs. Manual: an inputs builder (JSON Schema `inputs`). Scheduled: an
interval (`every`) or a calendar (rrule) form; a schedule the form cannot write back unchanged is
left to the YAML tab. Event triggers: a connector id and a KQL condition. Other triggers show "No
configuration needed". Triggers are addressed by index, so the panel closes if the YAML changes
from outside it.

### Workflow settings flyout

Opened from the header gear. **General**: name, description, tags and the Execution section
(timeout, maximum step size, concurrency group key, limit and strategy). **Constants** and
**Outputs**: add, edit and delete; deleting or renaming a referenced constant, and renaming any
output, asks for confirmation. The flyout is always openable, but it is editable only when the setting is on and
`isEditorReadOnly` is false.

## Known limitations

- **No insertion at the head of a non-empty `foreach` or `while` body.** The container has no edge
  to its first inner step, and its `steps` branch is excluded from the wire controls on purpose.
  Only an empty body gets an "add first step" `+`.
- **`iteration-on-failure.fallback` is neither drawn nor authorable on the canvas.** The shared
  traversal and the YAML mutations know it; the graph transform does not read it. Use the YAML tab.
- **No failure port on `if`, `foreach`, `parallel`, `while` or `atomic`** (see above).
- **No Duplicate, no redo gesture, no drag-to-connect.** ADR-0005 planned redo; only undo shipped.
- **Renames.** A step rename from the panel rewrites references, including mentions in plain prose
  (a reference cannot be told from text outside `{{ }}`). Renaming a constant or an output asks for
  confirmation but does **not** rewrite references.
- **Data picker scope.** The Steps group is document order only (`get_document_order_predecessors.ts`,
  TODO for branch-local scope); loop variables come from the separate Step context group. Many
  actions declare no output schema, so their output is an opaque `steps.<name>.output`.
- **ES|QL fields** keep their specialised editor, with no expand or collapse.
- **A step named `constructor`** failed to render the graph and its panel when tried live (flag on
  or off). The cause is not traced.
- **Undo while the graph shows.** The hidden Monaco model trails the store by 300 ms; a ⌘Z pressed
  before it catches up is swallowed, and a second press works.

---

## Architecture overview

### Packages and their roles

| Package | Role in authoring |
|---|---|
| `@kbn/workflows` (`graph_layout/`) | Logical graph construction (`transformWorkflowToGraph`: nodes, edges, join and bypass-lane nodes, `nodeRefs`, `fallbackLanes`, `structure`); `visitStepChildSlots` (shared traversal) |
| `@kbn/dag-layout` | Dagre wrapper; `dagLayout` returns positioned nodes only, with fallback lanes placed separately (`reservedLanes`); edge routing is computed in `@kbn/workflows-ui` |
| `@kbn/workflows-ui` (`components/workflow_graph/`) | ReactFlow rendering; structure-driven cross-axis packing after `dagLayout` (`pack_workflow_structure.ts`, `workflow_layout_pipeline.ts`; ADR-0013); edge routing (`compute_edge_path.ts`); the edit surface (`WorkflowGraphEditActions`: `onInsert`, `onEditStep`, `onDeleteNode`), ports, wire controls, pending node, insertion points, insert animation; lazy canvas and icon set (ADR-0014) |
| `@kbn/workflows-yaml` | Validation and parse utilities (`detectIndent`, `isReferenceValue`, …). Its `lib/yaml_edit` insertion primitives have **no** production call site (ADR-0015) |
| `workflows_management` (`features/workflow_visual_editor/`) | The stateful editor (`workflow_visual_editor_stateful.tsx`), pure mutations (`lib/yaml_mutations.ts`), the step and trigger panels, form schema (`lib/step_form_schema.ts`), data references, undo (`use_canvas_undo.ts`) |
| `workflows_management` (`features/actions_menu_popover/`, `pages/workflow_detail/ui/`) | The insertion menu; the settings flyout, header and the YAML and graph layers (`workflow_detail_editor.tsx`) |

### Layout pipeline

`transformWorkflowToGraph` → `computeWorkflowLayout` (fork nodes inflated, `dagLayout`, inflation
undone, `packCrossAxis` sets every cross-axis coordinate from `structure`) → `computeEdgePath`
routes edges from the final handle positions. Dagre waypoints are dropped. The layout memo key is
the topology fingerprint (ADR-0013).

### Lazy boundaries

The visual editor, the YAML editor, the graph canvas, the actions menu and the EUI icon set are each
one lazy chunk, so authoring weight is in async chunks and not in the page-load bundle (ADR-0014).
The execution graph and the settings flyout are still static.

### Data flow for a graph gesture

1. A canvas event calls an edit action, for example `edit.onInsert(context, anchor)`. The actions
   are stable and read the latest state from a ref.
2. For an insert, the actions menu opens; picking an action runs `handleInsertAction`.
3. The stateful editor calls one `yaml_mutations` function on `yamlString`. It returns a
   `MutationResult` (ADR-0015): on failure a translated toast, otherwise the new YAML.
4. `applyMutation` commits it with `applyYamlEdit` (synchronous compute; ADR-0002), or with
   `setYamlString` and a 250 ms debounced compute for typing edits.
5. The definition recomputes, the graph re-renders, and the new node is resolved, selected and
   flashed once the graph catches up. Selection lives in the URL state (`selectedStepId`) and
   drives the panel.
6. If the YAML changes under an open panel (undo, the YAML editor), `resolveExternalStepFragment`
   hands the panel the step as it now is (`syncedFragment`) when it differs semantically.
7. Undo: ⌘Z / Ctrl+Z calls `editor.trigger('graph-gesture', 'undo', null)` on the main Monaco
   editor (ADR-0005). It is ignored inside Monaco and form controls.

### Gate: `canEdit`

```ts
const canEdit =
  isVisualEditorEnabled && Boolean(canUpdateWorkflow) && !isExecutionsTab && !isEditorReadOnly;
```

`isVisualEditorEnabled` is the `workflows:experimentalFeatures` setting (default off, requires a page
reload). It also makes the graph the default view (otherwise YAML is), makes the settings flyout
editable, and turns on reference drag and click in the execution data views.
`isEditorReadOnly` (`useWorkflowEditorReadOnly`) is true for managed workflows, a missing edit
permission, and the executions tab (which must never overwrite the live draft with a frozen
execution YAML).

With `canEdit` false the graph renders with no edit actions (no controls, no ports); a node click
still selects it and opens the panel read-only. Undo is only enabled when
`canEdit && editorView === 'graph'`.

While the YAML has **syntax errors** the canvas shows "YAML has errors — fix to update graph", dims,
and ignores pointer events, so no gesture can run against a stale graph.

The mutation source is always `selectYamlString`, never `selectEditorYaml`. On the executions tab
`selectEditorYaml` returns `execution?.yaml`; mutating from it would overwrite the live draft with a
historical document. `selectEditorYaml` is only read, for panel baselines.

---

## Vocabulary

See [`@kbn/workflows/CONTEXT.md`](../../../../../../src/platform/packages/shared/kbn-workflows/CONTEXT.md) for the canonical glossary. Key terms:

- **lane** — the cross-axis extent of one child slot's steps; declaration order is the invariant enforced by the cross-axis packer (ADR-0013)
- **port** — the interactive attachment point (affordance), not the ReactFlow `Handle` primitive; today only the failure port is node-anchored
- **wire control** / **terminal control** — the `+` on a wire (hover) / at a dangling exit (always visible)
- **fallback steps** — steps under `on-failure.fallback`; not "error handling steps"
- **fallback lane** — the placed row/column of fallback steps; not "error branch"
- **snippet** — generated step YAML used by the editor's actions menu; not "template" or "fragment"
- **anchor step** — the step an insertion is addressed relative to; not bare "anchor"
