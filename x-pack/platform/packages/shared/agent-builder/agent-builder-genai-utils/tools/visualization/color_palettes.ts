/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { LENS_DYNAMIC_COLOR_PALETTES } from '@kbn/palettes';
import { chartTypeRegistry } from './chart_type_registry';

/**
 * Number of color stops sampled from each palette when describing it to the LLM.
 *
 * Matches the default the Lens UI palette picker renders (`DEFAULT_COLOR_STEPS = 5`
 * in `@kbn/coloring`), so the colors we surface here are exactly what a user
 * would see when picking the palette in the editor.
 */
const PROMPT_PALETTE_PREVIEW_STEPS = 5;

const PALETTE_PREVIEWS: ReadonlyArray<{
  id: string;
  name: string;
  colors: readonly string[];
}> = LENS_DYNAMIC_COLOR_PALETTES.map((palette) => ({
  id: palette.id,
  name: palette.name,
  colors: palette.colors(PROMPT_PALETTE_PREVIEW_STEPS),
}));

const formatPalettePreview = ({ name, colors }: (typeof PALETTE_PREVIEWS)[number]): string =>
  `- ${name}: ${colors.join(', ')}`;

/**
 * Returns the color-rules section appended to `createGenerateConfigPrompt`'s
 * system prompt for chart types whose schema accepts `colorByValueSchema`
 * (i.e. `supportsDynamicColoring` in the chart registry — currently `metric`,
 * `gauge`, `heatmap`, `datatable`). For all other chart types Lens applies
 * sensible defaults, so we return an empty string and skip the section.
 *
 * Palette previews are derived from `LENS_DYNAMIC_COLOR_PALETTES` at module
 * load, so any change to the palettes Lens registers for dynamic coloring is
 * picked up automatically.
 */
export const getColorPalettesPromptContent = (chartType: SupportedChartType): string => {
  if (!chartTypeRegistry[chartType]?.supportsDynamicColoring) {
    return '';
  }

  return [
    'COLOR PALETTE RULES:',
    '',
    '1) WHEN to apply color',
    '- Apply value-based coloring proactively whenever color adds meaning — e.g. utilization / saturation, latency, error rates or counts, success rates, throughput, anything with status or good-vs-bad / hot-vs-cold semantics.',
    '- For neutral data with no such meaning (raw counts, IDs, names, arbitrary categorical labels), OMIT the `color` field and let Lens use its defaults.',
    '- When the user explicitly requests a palette or scheme ("color from green to red", "use a temperature palette"), honor that request directly.',
    '- When you do set color, use `type: "dynamic"`. NEVER use the deprecated `type: "legacy_dynamic"`.',
    '',
    '2) PICK exactly ONE palette',
    '- Choose a single palette from the list below whose semantics match the metric. The chosen palette name MUST come from this list verbatim.',
    '  - "Status" — good→bad ranges with success / warning / danger zones (SLO compliance, severity).',
    '  - "Temperature" — diverging cool→hot data with a meaningful middle (latency, response time, anything temperature-like).',
    '  - "Complementary" — symmetric diverging data with a neutral midpoint.',
    '  - "Negative" (red) — "lower is better" or alarming metrics (errors, failures, anomalies).',
    '  - "Positive" (green) — "higher is better" metrics (success rate, conversions, throughput).',
    '  - "Cool", "Warm", or "Gray" — monochromatic gradients when only magnitude matters and there is no inherent good/bad signal.',
    '',
    '3) FILL `steps` from THAT palette ONLY',
    '- EVERY hex code in `steps` MUST be copied verbatim from the single palette you picked in step 2. Do NOT mix colors from different palettes — combining e.g. a red from "Negative" with a blue from "Cool" in the same `steps` array is forbidden, even when it would look "nicer".',
    '- Do NOT invent colors, do NOT interpolate between palettes, and do NOT modify hex values. If a palette does not match the data, pick a different palette in step 2 — never substitute individual colors.',
    "- By default keep the chosen palette's natural order (low values → first color, high values → last color) so the rendered result matches the Lens UI palette picker.",
    '- There is no `reverse` field in the schema, so to flip the gradient (e.g. you want LOW success rates highlighted with the most saturated Positive color), reverse the colors yourself in the `steps` array — but still use only colors from the SAME palette.',
    '- To use fewer than 5 steps, take a contiguous slice starting from one end of the chosen palette (the end you choose depends on whether low or high values should stand out).',
    '',
    `Available named palettes (canonical ${PROMPT_PALETTE_PREVIEW_STEPS}-stop previews from the Lens UI palette picker):`,
    ...PALETTE_PREVIEWS.map(formatPalettePreview),
  ].join('\n');
};
