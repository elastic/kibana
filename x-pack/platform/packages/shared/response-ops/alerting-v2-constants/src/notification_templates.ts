/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Default params YAML for a simple workflow email step: one Markdown block per alert. */
export const DEFAULT_EMAIL_PARAMS_TEMPLATE = `to:
  - ""
subject: ""
message: |
  {%- assign alert_count = inputs.payload.alerts | size -%}
  {%- if alert_count > 1 -%}
  **{{ alert_count }} alerts**

  {% endif -%}
  {%- for alert in inputs.payload.alerts -%}
  **{{ inputs.payload.rules[alert.rule_id].name | default: "Unnamed rule" }}** — {{ alert.alert_status | capitalize }}{% if alert.severity %} · {{ alert.severity | capitalize }}{% endif %}\\
  Last event {{ alert.last_event_timestamp | date: "%Y-%m-%d %H:%M UTC", 0 }} · [View in app]({{ alert.alert_url }})\\
  Alert id: {{ alert.alert_id }}
  {% unless forloop.last %}
  {% endunless -%}
  {%- endfor -%}
`;

/** Default params YAML for a simple workflow Slack (v2) step: one mrkdwn block per alert. */
export const DEFAULT_SLACK2_PARAMS_TEMPLATE = `channel: ""
text: |
  {%- assign alert_count = inputs.payload.alerts | size -%}
  {%- if alert_count > 1 -%}
  *{{ alert_count }} alerts*

  {% endif -%}
  {%- for alert in inputs.payload.alerts -%}
  *{{ inputs.payload.rules[alert.rule_id].name | default: "Unnamed rule" }}* — {{ alert.alert_status | capitalize }}{% if alert.severity %} · {{ alert.severity | capitalize }}{% endif %}
  Last event {{ alert.last_event_timestamp | date: "%Y-%m-%d %H:%M UTC", 0 }} · <{{ alert.alert_url }}|View in app>
  Alert id: {{ alert.alert_id }}
  {% unless forloop.last %}
  {% endunless -%}
  {%- endfor -%}
`;
