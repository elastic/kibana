# @kbn/response-ops-rules-page-tabs

Shared Rules page header tabs so the v1 (`triggers_actions_ui`) and v2
(`alerting_v2`) Rules pages present as a single tabbed page, even though they are two
separate Stack Management apps. Each tab navigates via a plain `href` to the other app's
Rules route — it does not carry any in-page state.

The package owns the tab **content** (ids, labels, the "New" badge, ordering, `data-test-subj`,
selected state, and the rule that a lone tab renders nothing), so both apps stay in sync. The
consumer owns the **bindings**: it passes each tab's prepended `href` (destinations differ per
solution flavor) and decides visibility by omitting a tab's binding when the user lacks access
or the surface is disabled. That keeps privilege and route knowledge in the plugins that own it,
so this package depends on neither `triggers_actions_ui` nor `alerting_v2`.
