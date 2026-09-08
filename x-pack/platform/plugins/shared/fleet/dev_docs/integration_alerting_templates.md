# Integration alerting templates: behaviour and enablement

**Status:** implemented
**Audience:** operators installing integrations that ship alerting rule templates
**Source of truth:** `x-pack/platform/plugins/shared/fleet/server/services/epm/packages/install_state_machine/steps/step_create_alerting_assets.ts`

A Fleet package can ship **alerting rule templates** in
`kibana/alerting_rule_template/`. This page describes what happens to them at
install time and what an operator must do to get alerts firing.

## The short version

Installing the package **creates the rules, disabled, with no actions**. Nothing
fires until an operator adds actions and enables them. This is intentional, not
an oversight.

## Why rules are not enabled on install

An installed integration cannot know:

- **where** alerts should go — no connector or channel is configured yet, and
- **whether** the thresholds suit this deployment.

A rule enabled on install with no actions would evaluate on a schedule and
notify nobody, producing load and a false sense of coverage. Worse, one that
guessed a channel would page a team that never opted in.

So install creates each rule with:

```
enabled: false
actions: []
```

The rule exists, is visible, and is ready — but is inert until an operator
completes it.

## Historical behaviour

Before this behaviour landed, templates imported as saved objects **only**. No
rule was created; an admin had to find each template and hand-create a rule from
it. This caused a recurring support question — *"I installed the integration,
why are there no rules?"* — because nothing in the UI indicated a manual step
remained.

Rules are now materialised at install. The manual step that remains is adding
actions and enabling, which is the step that genuinely requires a human
decision.

## Enablement steps

1. **Create a connector** for the destination (Slack, email, PagerDuty, …) under
   *Stack Management → Connectors*, if one does not exist.
2. Open *Stack Management → Alerts and Insights → Rules*. Rules from the package
   appear disabled, named after their templates.
3. **Open a rule → Actions → add an action**, selecting the connector and the
   message. Set the action frequency (typically *on active alert*).
4. **Review the rule params** — thresholds ship as sensible defaults, not as
   values tuned for your data volume.
5. **Enable** the rule.

Repeat per rule; enablement is deliberately per-rule so an operator can adopt a
subset without taking all of them.

### Notification destination

Route integration alerts to the **owning team's channel**, not a general alerts
channel. Alerts from an integration are actionable by the team that owns the
integrated system; sending them to a catch-all channel is the most common cause
of alert fatigue and silent muting.

## Reinstall and upgrade

On reinstall, rules that already exist are **not recreated**, which preserves the
actions and enabled state an operator configured.

There is one consequence worth knowing: a rule's params are refreshed only where
the install step detects a data stream pattern change. **Other template content
edits — for example a changed threshold in a new package version — do not
propagate to an already-created rule.** To pick those up, delete the rule and
reinstall the package, which recreates it from the current template.

This is the deliberate trade: preserving operator configuration is worth more
than automatically pushing template edits over it, since the latter could
silently retune an alert a team depends on.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Rules exist but never fire | Still disabled, or no actions attached | Add an action, then enable |
| Rule enabled but nobody notified | `actions: []` — enabling alone does not add a destination | Add an action to the rule |
| Threshold change in a package upgrade had no effect | Existing rules are not overwritten | Delete the rule and reinstall |
| No rules at all after install | Package ships no templates, or install failed before the alerting step | Check the package contents and install logs |

## Related

- [Fleet package authoring guide (Kibana-only ETL)](./kibana_only_etl_package_authoring.md)
- [Reference architecture: packaged multi-source ETL on Kibana](./packaged_etl_reference_architecture.md)
