# AI Anonymization Settings Plugin

This plugin provides a dedicated Stack Management page (sibling to **GenAI Settings**) for configuring the
regex and NER based anonymization rules (`ai:anonymizationSettings`) used by the inference plugin's
`chatComplete` anonymization pipeline. It replaces the previous Observability-only exposure of this setting,
making it available to every Kibana offering.

This page is an interim UI: it renders the existing advanced-settings JSON editor for the setting. A
dedicated rule-editing UI is tracked as separate follow-up work.
