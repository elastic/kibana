# @kbn/change-history-ui

Shared browser package for **change history** UI in Kibana. Domains integrate via `ChangeHistoryAdapter`; the package ships a **fullscreen modal** shell and reusable timeline components.

## Integration (3 steps)

1. **Implement `ChangeHistoryAdapter`** — `listChanges` and `getChange`, optional `restoreChange.
2. **Wrap with `ChangeHistoryProvider`** — pass adapter, `renderPreview`, optional `renderBadge`, labels and optional `features`.
3. **Render `ChangeHistoryTrigger` + `ChangeHistoryModal`** — modal overlay; no dedicated route required.

```tsx
<ChangeHistoryProvider
  objectId={workflowId}
  adapter={workflowChangeHistoryAdapter}
  renderPreview={renderWorkflowYamlPreview}
  renderBadge={renderWorkflowBadge}
>
  <ChangeHistoryTrigger />
  <ChangeHistoryModal />
</ChangeHistoryProvider>
```

## Exports

- Types (`ChangeHistoryAdapter`, DTOs, …)
- `ChangeHistoryProvider`, `useChangeHistoryConfig`, `useChangeHistoryList`, `useChangeHistoryDetail`
- `ChangeHistoryModal`, `ChangeHistoryTrigger`, `ChangeHistoryPreviewPanel`
- Timeline (`ChangeHistoryTimeline`, …)
- `createChangeHistoryHttpAdapter`
