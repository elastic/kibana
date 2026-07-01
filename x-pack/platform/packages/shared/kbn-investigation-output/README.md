# @kbn/investigation-output

Renders the summary and output of an investigation (a root-cause-analysis run by an AI
agent) so it can be embedded anywhere in Kibana — a significant-event flyout, a case, a
chat panel, etc.

- `InvestigationOutput` — presentational component. Takes no service dependencies; the
  caller supplies `status`, the final `result` and/or live `progress`, and an optional
  `onOpenDetails` handler.
- `useFollowInvestigationProgress` — hook that follows an agent-builder execution's live
  event stream and surfaces the latest structured progress update reported by the
  investigation agent, so `InvestigationOutput` can render live progress before the
  investigation workflow completes.
