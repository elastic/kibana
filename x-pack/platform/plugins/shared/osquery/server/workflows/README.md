# Osquery Workflow Steps — Server

Server-side step handlers for the four osquery workflow steps: `runQuery`, `runPack`, `getResults`, `getSavedQuery`.

## Authorization model

Every handler enforces the workflow author's identity against the live osquery capability set before performing any side effect or data read. This mirrors what `POST /api/osquery/live_queries` does at the HTTP layer.

**Write steps** (`runQuery`, `runPack`): call `requireOsqueryWriteAuthz(coreStart, fakeRequest, params)` from `utils.ts`. This checks `writeLiveQueries OR (runSavedQueries AND saved_query_id/pack_id)` via `isOsqueryResponseActionAuthorized`. Returns `ExecutionError({ type: 'PermissionError' })` on failure.

**Read steps** (`getResults`, `getSavedQuery`): call `requireOsqueryReadAuthz(coreStart, fakeRequest)` from `utils.ts`. This checks `readLiveQueries`. Returns `ExecutionError({ type: 'PermissionError' })` on failure.

`fakeRequest` is obtained via `context.contextManager.getFakeRequest()`, which carries the workflow author's identity for both manually-triggered and schedule/cron-triggered workflow runs — see Design D9 in `openspec/changes/osquery-workflows-extensions/design.md`.

## Audit trail

Write step handlers pass `metadata: { source: 'workflows', workflow_id, execution_id, currentUser, userProfileUid }` into `createActionService.create()`. This tags each action document so the Osquery History UI can distinguish workflow-originated queries from UI-originated ones, and so investigators can trace any action document back to the specific workflow execution that created it.
