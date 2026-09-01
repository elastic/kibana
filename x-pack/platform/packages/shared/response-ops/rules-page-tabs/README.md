# @kbn/response-ops-rules-page-tabs

Shared Rules page header tabs so the v1 (`triggers_actions_ui`) and v2
(`alerting_v2`) Rules pages present as a single tabbed page, even though they are two
separate Stack Management apps. Each tab navigates via a plain `href` to the other app's
Rules route — it does not carry any in-page state.

Lives as a standalone package (rather than a plugin contract) because `triggers_actions_ui`
must keep working when `alerting_v2` is disabled, and each side needs the other's route —
this package owns both routes so neither plugin depends on the other.
