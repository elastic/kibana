# Running workflows from Cases

Cases runs workflows through a Cases-owned HTTP wrapper. The wrapper keeps the shared Workflows
execution API generic while ensuring every run started from a case is authorized against that case
and represented in its activity.

## Architecture

`RunWorkflowPanel` accepts an optional `runWorkflow` executor. Cases supplies an executor returned by
`useCasesWorkflowExecutor`; callers outside Cases omit the prop and continue to use the Workflows
Management API directly.

The Cases executor posts to:

```text
POST /internal/cases/{case_id}/workflows/{workflow_id}/run
```

with:

```ts
{
  inputs: Record<string, unknown>;
  origin: {
    type: 'cases.case' | 'cases.observable' | 'cases.alert' | 'cases.alerts';
    id: string;
  };
}
```

The response is:

```ts
{
  workflowExecutionId: string;
  activityStatus: 'succeeded' | 'failed';
}
```

`activityStatus` describes only the Cases activity write. A failed activity write does not discard
the workflow execution ID or report that the workflow failed to start. The Cases executor shows a
warning toast and returns the execution ID so the shared panel can keep its normal success behavior.

## Server flow

The route requires the Workflows Management execute operation privilege. Before starting a workflow,
the Cases client also resolves the stored case owner, enforces owner-aware update authorization, and
checks user-action capacity. The activity write repeats those checks to cover races.

The service:

1. Checks that Workflows are available.
2. Preflights Cases update authorization and user-action capacity.
3. Loads the case and validates that the requested origin belongs to it.
4. Loads the saved workflow for authoritative name, validity, and enabled-state checks.
5. Preprocesses alert inputs with the Workflows Management alert preprocessor.
6. Starts the workflow with `waitForCompletion: false` and server-owned metadata:

   ```ts
   {
     schemaVersion: 1,
     source: 'cases',
     caseId,
     origin,
   }
   ```

   `CasesWorkflowExecutionMetadataSchema` defines and validates this versioned shape. The metadata
   is an opaque execution annotation, not an indexed Cases correlation model; case history comes
   from Cases user actions.

7. Records the existing Cases workflow user action directly.

The activity write resolves the stored case owner, checks update authorization and user-action
capacity, and stores the workflow ID, authoritative name, execution ID, and origin. Alert and
observable origins retain their display metadata when it can be derived from the processed event.

Cases owns audit events for the workflow-start attempt and for activity-write failures. If step 7
fails, the service logs the failure and returns the execution ID with
`activityStatus: 'failed'`.

## Entry points

### Case

Both the legacy and redesigned case headers use `useRunCaseWorkflow`. It keeps the existing
capability, UI setting, tag filter, and trigger-aware sorting gates, and supplies:

```ts
{ type: 'cases.case', id: caseId }
```

### Observable

The observable action popover keeps its existing `observablesAdded` event payload and sorting. Its
executor supplies:

```ts
{ type: 'cases.observable', id: observableId }
```

### Alerts in a case

Security Solution's alert table remains reusable outside Cases. A generic
`AlertWorkflowExecutorProvider` can override execution for an embedding surface without importing
Cases into the alert action implementation.

Only the case alert tab installs that provider. Its Cases executor derives:

- one selected alert: `{ type: 'cases.alert', id: alertId }`
- multiple selected alerts: `{ type: 'cases.alerts', id: caseId }`

Alert tables outside Cases have no provider and continue to use the default Workflows executor.
Document workflow runs are also unchanged.

### Automatic triggers

The wrapper is only for user-initiated runs from Cases surfaces. Automatic workflows still use
Cases-owned event emission and the Workflows trigger engine. In particular,
`cases.observablesAdded` continues to fire after newly added observables are persisted; it does not
call the manual wrapper endpoint or create a manual workflow activity entry.

## Activity origins

The origin constants live with the Cases workflow user-action domain rather than in the generic
Workflows execution-context framework. Persisted activity continues to support the existing
`cases.comment` and `cases.attachment` origin values, while manual wrapper runs accept only case,
observable, single-alert, and bulk-alert origins.

Workflow activity rendering, configured workflow tags, and the `observablesAdded` trigger are
unchanged by this refactor.
