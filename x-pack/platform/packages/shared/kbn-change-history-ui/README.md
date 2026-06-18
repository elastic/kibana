# @kbn/change-history-ui

Shared browser package for **change history** UI in Kibana. Domains integrate via `ChangeHistoryAdapter`; the package ships a **fullscreen modal** shell and reusable timeline components.

## Integration (3 steps)

1. **Implement `ChangeHistoryAdapter`** — `listChanges`, `getChange`, optional `restoreChange` / `listActors`.
2. **Wrap with `ChangeHistoryProvider`** — pass adapter, labels, `renderPreview`, and optional `features`.
3. **Render `ChangeHistoryTrigger` + `ChangeHistoryModal`** — modal overlay; no dedicated route required.

## Exports

- Types (`ChangeHistoryAdapter`, DTOs, …)
- `createChangeHistoryHttpAdapter`
