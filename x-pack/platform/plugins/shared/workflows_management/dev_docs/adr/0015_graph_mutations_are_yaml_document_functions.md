# ADR-0015 — Graph mutations are pure functions over the YAML Document

**Status:** Accepted
**Date:** 2026-11-26
**Deciders:** @elastic/workflows-eng

Supersedes [ADR-0006](0006_graph_mutations_reuse_snippet_path.md).

## Context

ADR-0006 decided that graph mutations would reuse `insertStepSnippet` (extended with an
`insertAfterStepName` parameter) and write through the Monaco model with `pushUndoStop` /
`pushEditOperations`. That is not what shipped:

- `insertStepSnippet` was never extended, and graph mutations never touch the Monaco model.
- `duplicateStep` was planned and removed unused.
- The mutations are pure functions over the `yaml` `Document` AST in
  [`yaml_mutations.ts`](../../public/features/workflow_visual_editor/lib/yaml_mutations.ts).

ADR-0006 stayed `Accepted` while the code diverged, and its Context and Decision sections no
longer describe the system. This directory's contract is that an accepted ADR is superseded, not
edited, so the decision that actually holds gets its own record.

## Decision

Every canvas mutation (insert, delete, replace a step or trigger fragment, set a fallback) is a
pure function that takes the full workflow YAML and returns the new YAML:

- It parses with `parseDocument`, changes the AST, and serialises it back, so comments, quoting and
  unknown keys survive.
- It returns a `MutationResult`: either `{ success: true, yaml }` or
  `{ success: false, yaml, error }`, where `error` carries a machine-readable `code` and the data
  needed to build a message. The caller translates it; the module contains no user-facing text.
- It never reads or writes the Monaco model. The caller commits the result with `applyYamlEdit`
  (ADR-0002). Undo works because the controlled editor `value` changes (ADR-0005), not because of an
  edit operation.
- Read helpers (`getStepFragment`, `getStepSourceRange`) do not change the node they read; only the
  write paths normalise a flow-style sequence to block style.
- `insertStepSnippet` remains the editor-menu insertion path, unchanged.

## Alternatives considered

**ADR-0006: extend `insertStepSnippet` and write through the Monaco model.** Not taken. It would
have made every mutation depend on a live Monaco model and a cursor-oriented API, and the extension
was never written.

**`@kbn/workflows-yaml` `yaml_edit` primitives (`insertStep`, `deleteStep`, `modifyStep`).** Not
taken, for the reason ADR-0006 gave: they have no production call sites.

## Consequences

- Mutations are unit-tested with plain YAML strings, no Monaco model: `yaml_mutations.test.ts`
  covers success paths, every error code, flow-style and block-style steps, and fallback slots.
- Graph mutations and editor-menu insertions are two implementations, which is the duplication
  ADR-0006 set out to avoid. A fix in `insertStepSnippet` does not reach the graph path, and the
  reverse.
- Adding a mutation means adding a `MutationError` code if it can fail in a new way, and a message
  for it in the stateful editor's `getMutationErrorMessage`.
- `setStepFallback` replaces any existing `on-failure.fallback` and keeps the sibling `on-failure`
  keys.
- `yaml_edit`'s insertion primitives remain exported and unused in production.
