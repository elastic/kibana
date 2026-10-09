/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * CSS custom properties available inside custom content panel iframes.
 * Resolved client-side from the active EUI theme so they work for both light
 * and dark mode, including the 'system' setting.
 */
export const CUSTOM_CONTENT_CSS_VARS_GUIDANCE = `Use these CSS custom properties — they resolve to the correct EUI palette for both light and dark themes at render time:
- Required body reset: body { margin: 0; padding: 16px; box-sizing: border-box; font-family: Inter, system-ui, sans-serif; color: var(--cc-color-text); background: var(--cc-color-background); }
- Card/surface backgrounds: var(--cc-color-surface).
- Accent colors: var(--cc-color-primary) (blue), var(--cc-color-accent) (teal), var(--cc-color-accent-2) (pink), var(--cc-color-warning) (yellow).
- Danger/error: var(--cc-color-danger). Border color: var(--cc-color-border).`;

/**
 * Iframe sandbox security constraints that apply to all custom content panels.
 * Suitable for embedding directly in LLM system prompts or tool descriptions.
 */
export const CUSTOM_CONTENT_SANDBOX_GUIDANCE = `ABSOLUTE, NON-NEGOTIABLE RULE: the template renders inside a sandboxed iframe with scripting disabled. ANY JavaScript you write — a <script> tag, an inline event handler (onclick, onmouseover, ...), or building any part of the markup at runtime via document.getElementById/innerHTML/addEventListener/JSON.parse/fetch — will NEVER RUN. It is completely dead code and will render as a BLANK PANEL.
- Write every element directly as static HTML/SVG — never assemble markup as a string in JavaScript and inject it via innerHTML.
- If the prompt asks for hover interactivity (e.g. tooltips), this IS possible with CSS :hover alone — do NOT reach for JavaScript. Use a nested element that is invisible by default (\`opacity: 0\`) and reveal it with a \`:hover\` rule.
- Do NOT use <a> anchor tags or href attributes of any kind.
- Do NOT load any external resources. No CDN scripts, no Google Fonts, no image URLs.
- Do NOT use <img> tags with an external \`src\` — the panel's CSP blocks all outbound network requests. For images, icons, or illustrations draw them with inline SVG, pure CSS shapes, or a Unicode emoji/symbol instead.
- For diagrams and progress indicators, use pure CSS or inline SVG.`;

/**
 * LiquidJS data model available inside ES|QL-backed custom content templates.
 */
export const CUSTOM_CONTENT_LIQUID_DATA_MODEL_GUIDANCE = `DATA MODEL available in the template:
- rows: array of row objects. Access a column with its EXACT name using bracket notation: row["exact column name"].
  Each column access resolves to an object: .value is the raw cell value, .pct is that column's value as a percentage (0–100) of its max across all rows (numeric columns only).
- max: object of column max values, also keyed by exact column name. e.g. max["total_revenue"]

LIQUID SYNTAX:
- Loop rows:     {% for row in rows %}...{% endfor %}
- Empty state:   {% if rows.size == 0 %}...{% endif %}
- Conditionals:  {% if row["revenue"].value >= 10000 %}...{% elsif row["revenue"].value >= 5000 %}...{% else %}...{% endif %}
- Output value:  {{ row["column name"].value }}
- Bar width:     <div style="width: {{ row["column name"].pct }}%; ..."></div>
- Filters:       {{ row["column name"].value | round: 2 }}`;
