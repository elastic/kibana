# Data Phases Components

This directory contains UI components used by the stream lifecycle data tiers flow.

Run `yarn storybook streams_app` from the Kibana root to preview these components locally.

## `DefaultSnapshotRepositoryRequiredModal`

`default_snapshot_repository_required_modal/default_snapshot_repository_required_modal.tsx` is shown when a user tries to add a frozen ILM phase but no snapshot repositories are available. Frozen phases require a snapshot repository, so the modal asks the user to create a default repository before refreshing the lifecycle panel.

The create action is rendered as a filled `EuiSplitButton.ActionPrimary` link. The parent should provide `createDefaultRepositoryUrl` with `application.getUrlForApp('management', { path: '/data/snapshot_restore/add_repository' })`, and the modal opens it with `target="_blank"` so the user can create the repository in Snapshot and Restore without losing their current stream lifecycle context.

The refresh action is the split button secondary icon action. It stays in the modal and calls `onRefresh`, which should re-fetch snapshot repositories and continue the frozen phase flow once a repository exists. Because this action is icon-only, it must keep an accessible `aria-label`.

Use `EuiSplitButton` here instead of separate buttons so the create and refresh actions share the connected filled-button treatment from EUI. Avoid `EuiButtonGroup` for this case because it is intended for selection controls, not related actions.
