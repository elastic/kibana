# AI Anonymization Settings Plugin

This plugin provides a dedicated Stack Management page (sibling to **GenAI Settings**) for configuring the
regex-based anonymization rules (`ai:anonymizationSettings`) used by the inference plugin's `chatComplete`
anonymization pipeline. It is available to every Kibana offering.

The page has four tabs:

- **Built-in patterns**: Elastic-maintained regex rules (email, IPv4, host/machine names, account and login
  names). Each can be individually enabled/disabled; their patterns are not editable from the UI.
- **Custom patterns**: user-authored regex rules, added/edited via a flyout (name, entity type, pattern,
  enabled).
- **Pattern tester**: runs the currently-enabled rules against sample or user-provided JSON via a
  non-persisting backend endpoint, and shows what was masked before content would be sent to a model.
- **Settings**: the master "Mask PII in AI requests" switch (mirrored in the page header) and the
  `onFailure` behavior (`block` vs `allow_unsafe`) used when anonymization cannot run.

Named-entity-recognition (NER) rule support still exists in the underlying schema and pipeline
(`chat_complete/anonymization/*` in the inference plugin) but is intentionally not surfaced anywhere on
this page.
