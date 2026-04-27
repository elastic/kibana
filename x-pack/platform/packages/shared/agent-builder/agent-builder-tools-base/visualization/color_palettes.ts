/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { LENS_DYNAMIC_COLOR_PALETTES, LENS_CATEGORICAL_COLOR_PALETTES } from '@kbn/palettes';
import { chartTypeRegistry } from './chart_type_registry';

/**
 * Number of color stops sampled from each categorical palette in the prompt
 */
const CATEGORICAL_PALETTE_PREVIEW_STEPS = 5;

const formatPalettePreview = ({
  name,
  colors,
}: {
  name: string;
  colors: readonly string[];
}): string => `- ${name}: ${colors.join(', ')}`;

const getGradientPalettePreviews = (steps: number): string[] =>
  LENS_DYNAMIC_COLOR_PALETTES.map((palette) =>
    formatPalettePreview({ name: palette.name, colors: palette.colors(steps) })
  );

const getCategoricalPalettePreviews = (): string[] =>
  LENS_CATEGORICAL_COLOR_PALETTES.map((palette) =>
    formatPalettePreview({
      name: `${palette.id} (${palette.name})`,
      colors: palette.colors(CATEGORICAL_PALETTE_PREVIEW_STEPS),
    })
  );

/**
 * Returns the color-rules section appended to the visualization config
 * generation prompt. Gated by `supportsDynamicColoring` and
 * `supportsCategoricalColoring` on the chart registry entry; returns an empty
 * string for chart types with neither (they inherit Lens defaults).
 */
export const getColorPalettesPromptContent = (chartType: SupportedChartType): string => {
  const entry = chartTypeRegistry[chartType];
  const supportsDynamic = entry?.supportsDynamicColoring ?? false;
  const supportsCategorical = entry?.supportsCategoricalColoring ?? false;

  if (!supportsDynamic && !supportsCategorical) {
    return '';
  }

  const stepsCount = entry?.paletteStepsCount ?? 5;
  const lines: string[] = ['COLOR PALETTE RULES:', ''];
  let sectionNumber = 1;
  const nextSection = () => sectionNumber++;

  lines.push(
    `${nextSection()}) WHEN to apply color`,
    '- Apply value-based coloring proactively whenever color adds meaning — e.g. utilization / saturation, latency, error rates or counts, success rates, throughput, status thresholds, or temperature-style intensity.',
    '- For neutral data with no such meaning (raw counts, IDs, names, arbitrary categorical labels), OMIT the `color` field and let Lens use its defaults.',
    '- When the user explicitly requests a palette or scheme ("color from green to red", "use a temperature palette"), honor that request directly.',
    ''
  );

  if (supportsDynamic && supportsCategorical) {
    lines.push(
      `${nextSection()}) CHOOSE the coloring mode based on the column type`,
      '- Numeric columns (counts, durations, percentages, bytes, etc.) → use the dynamic gradient form: `color: { type: "dynamic", range, steps: [...] }`. Follow the dynamic gradient rules below.',
      '- Keyword / text columns (status, host, service, env, error type, etc.) → use the categorical mapping form: `color: { mode: "categorical", palette: "<palette id>", mapping: [] }`. Follow the categorical mapping rules below.',
      '- NEVER apply categorical mapping to a numeric column or dynamic gradient steps to a keyword column.',
      '- NEVER use the deprecated `type: "legacy_dynamic"`.',
      ''
    );
  }

  if (chartType === SupportedChartType.Metric) {
    lines.push(
      `${nextSection()}) METRIC COLOR PLACEMENT`,
      '- For metric charts, prioritize coloring the metric value itself: set `apply_color_to: "value"`. Do NOT color the background unless the user explicitly asks for background coloring.',
      ''
    );
  }

  if (chartType === SupportedChartType.Datatable) {
    lines.push(
      `${nextSection()}) DATATABLE COLOR PLACEMENT`,
      '- For datatables, prioritize badge coloring: set `apply_color_to: "badge"` on colored row or metric columns. Do NOT use cell background coloring or text/value coloring unless the user explicitly asks for it.',
      ''
    );
  }

  if (supportsDynamic) {
    lines.push(
      `${nextSection()}) DYNAMIC GRADIENT — pick exactly ONE palette`,
      '- Choose a single palette from the gradient list below whose semantics match the metric. The chosen palette name MUST come from this list verbatim.',
      '  - "Status" — ordered status or threshold bands such as success / warning / danger (SLO compliance, severity).',
      '  - "Temperature" — temperature-style intensity scales where cooler and hotter colors represent opposite ends of the metric.',
      '  - "Complementary" — diverging data around a neutral midpoint (change, delta, deviation from target).',
      '  - "Negative" (red) — values that should read as adverse, alarming, failure-related, or attention-grabbing.',
      '  - "Positive" (green) — values that should read as favorable, healthy, successful, or on-track.',
      '  - "Cool", "Warm", or "Gray" — monochromatic gradients when only magnitude matters and there is no inherent status signal.'
    );

    if (chartType === SupportedChartType.Metric) {
      lines.push(
        '- Metric charts use 3 contiguous bands (low / mid / high, status thresholds, or alert bands), so prefer "Status", "Negative", "Positive", or "Temperature" when the metric has semantic thresholds. Avoid monochromatic palettes ("Cool", "Warm", "Gray") for metric unless the user explicitly asks for them.'
      );
    }

    lines.push(
      '',
      `${nextSection()}) DYNAMIC GRADIENT — fill \`steps\` from THAT palette ONLY`,
      `- Use exactly ${stepsCount} step${
        stepsCount === 1 ? '' : 's'
      } for a ${chartType} chart. Take a contiguous slice of ${stepsCount} colors from one end of the chosen palette (the end you choose depends on whether low or high values should stand out).`,
      '- HARD CONSTRAINT — single source palette: every hex in `steps[*].color` MUST come from ONE preview line below, character-for-character. Find the preview line for your chosen palette; every hex you produce must appear, exactly as written, somewhere in THAT one line.',
      '- This rule applies even to palettes that look visually similar or share tones. For example, building a custom red→green gradient by combining greens from "Positive" with reds from "Status" is FORBIDDEN — even though both palettes contain green-ish and red-ish hues, the exact hex values differ and Lens has tuned each palette as a coherent unit. The same applies to any other pairing: "Negative" + "Cool", "Temperature" + "Status", "Positive" + "Negative", etc. If the chosen palette\'s colors do not look "nice enough" on their own, that means you picked the wrong palette in the previous step — go back and pick a different one.',
      '- Do NOT invent colors, do NOT interpolate between palettes, and do NOT modify hex values (no shading, no opacity tweaks, no shortening `#aabbcc` to `#abc`). If a palette does not match the data, pick a different palette in the previous step — never substitute individual colors.',
      "- By default keep the chosen palette's natural order (low values → first color, high values → last color) so the rendered result matches the Lens UI palette picker.",
      '- There is no `reverse` field in the schema, so to flip the gradient (e.g. you want LOW success rates highlighted with the most saturated Positive color), reverse the colors yourself in the `steps` array — but still use only colors from the SAME palette.',
      '- VERIFY before output: scan your `steps` array. Every `color` value must appear, byte-for-byte, in the preview line of the SINGLE palette you picked. If even one hex is missing from that line, your output is invalid — fix it before producing the final JSON.',
      ''
    );
  }

  if (supportsCategorical) {
    lines.push(
      `${nextSection()}) CATEGORICAL MAPPING — pick a palette by id`,
      '- Set `color: { mode: "categorical", palette: "<palette id>", mapping: [] }` and let Lens auto-assign a distinct color per distinct value at render time.',
      '- The `palette` value MUST be one of the categorical palette ids listed below verbatim (e.g. `"default"`, `"eui_amsterdam"`).',
      '- Leave `mapping: []` by default. Only define explicit `mapping[]` entries when the user names specific values to color a certain way (e.g. "color errors red, success green") — at config-generation time you do not know the actual data values, so guessing them is wrong.',
      '- When the user does name explicit values, use `color: { type: "color_code", value: "#hex" }` for each entry, drawing the hex from one of the palettes below.',
      ''
    );
  }

  if (supportsDynamic) {
    lines.push(
      `Available gradient palettes (canonical ${stepsCount}-stop previews from the Lens UI palette picker, sized to match the ${stepsCount} \`steps\` you must produce for a ${chartType} chart):`,
      ...getGradientPalettePreviews(stepsCount),
      ''
    );
  }

  if (supportsCategorical) {
    lines.push(
      `Available categorical palettes (${CATEGORICAL_PALETTE_PREVIEW_STEPS}-color preview of each palette from the Lens UI color-mapping picker; pass the id, not the name):`,
      ...getCategoricalPalettePreviews()
    );
  }

  return lines.join('\n').trimEnd();
};
