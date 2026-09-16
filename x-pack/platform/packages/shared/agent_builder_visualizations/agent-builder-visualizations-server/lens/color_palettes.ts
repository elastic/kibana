/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getPalettes } from '@kbn/palettes';
import { chartTypeRegistry } from './chart_type_registry';

/**
 * Number of color stops sampled from each categorical palette in the prompt
 */
const CATEGORICAL_PALETTE_PREVIEW_STEPS = 5;

/**
 * Mirrors Lens palette pickers for agent prompts. Legacy palettes are excluded
 * so the agent uses the default/current palette set unless the user asks otherwise.
 */
const lensColorPalettes = getPalettes(false)
  .getAll()
  .filter(({ legacy }) => !legacy);

/**
 * Mirrors the Lens dynamic color picker: gradient palettes.
 */
const lensDynamicColorPalettes = lensColorPalettes.filter((palette) => palette.type === 'gradient');

/**
 * Mirrors the Lens categorical color picker.
 */
const lensCategoricalColorPalettes = lensColorPalettes.filter(
  (palette) => palette.type === 'categorical'
);

const formatPalettePreview = ({
  name,
  colors,
}: {
  name: string;
  colors: readonly string[];
}): string => `- ${name}: ${colors.join(', ')}`;

const getDynamicPalettePreviews = (steps: number): string[] =>
  lensDynamicColorPalettes.map((palette) =>
    formatPalettePreview({ name: palette.name, colors: palette.colors(steps) })
  );

const getCategoricalPalettePreviews = (): string[] =>
  lensCategoricalColorPalettes.map((palette) =>
    formatPalettePreview({
      name: `${palette.id} (${palette.name})`,
      colors: palette.colors(CATEGORICAL_PALETTE_PREVIEW_STEPS),
    })
  );

/**
 * Returns coloring guidance for the visualization config prompt: the general
 * coloring policy, the chart type's `coloringRules` from the registry, and —
 * when the chart supports dynamic/categorical coloring — the palette rules and
 * previews mirroring the Lens palette pickers.
 */
export const getColorPalettesPromptContent = (chartType: SupportedChartType): string => {
  const config = chartTypeRegistry[chartType].prompt.config;
  const coloringRules = config?.coloringRules ?? [];
  const coloringOptions = config?.options?.coloring;
  const dynamicColoringOptions = coloringOptions?.dynamic;
  const supportsDynamic = dynamicColoringOptions !== undefined;
  const supportsCategorical = coloringOptions?.categorical ?? false;

  if (!coloringRules.length && !supportsDynamic && !supportsCategorical) {
    return '';
  }

  const stepsCount = dynamicColoringOptions?.recommendedStepCount ?? 5;
  const lines: string[] = ['COLOR PALETTE RULES:', ''];

  if (supportsDynamic || supportsCategorical) {
    lines.push(
      'DEFAULT POLICY:',
      '- Prefer Lens defaults for unknown-scale data: use `color: { type: "auto" }` or omit `color` when Lens can calculate better thresholds at render time.',
      '- Generate explicit numeric `steps` only when the chart-specific rules allow it, or when the user asks for a custom palette or exact thresholds.',
      '- Do not color neutral data with no useful color meaning.',
      ...(coloringRules.length
        ? ['- The chart-specific coloring rules below override this policy where they differ.']
        : []),
      ''
    );
  }

  if (coloringRules.length) {
    lines.push(
      `${chartType.toUpperCase()} COLORING RULES:`,
      ...coloringRules.map((rule) => `- ${rule}`),
      ''
    );
  }

  if (supportsDynamic && supportsCategorical) {
    lines.push(
      'COLORING MODE — choose based on the column type:',
      '- Only add color when it adds meaning, improves readability, highlights status/severity, or the user asks for colored values.',
      '- Numeric columns → when coloring is useful, use `color: { type: "auto" }` by default; use `color: { type: "dynamic", range, steps: [...] }` only when explicit steps are allowed.',
      '- Keyword / text columns → when coloring is useful, use `color: { mode: "categorical", palette: "<palette id>", mapping: [] }`.',
      '- NEVER apply categorical mapping to a numeric column or dynamic palette steps to a keyword column.',
      '- NEVER use the deprecated `type: "legacy_dynamic"`.',
      ''
    );
  }

  if (supportsDynamic) {
    lines.push(
      'DYNAMIC STEPS — mechanics for when the rules above call for explicit `steps`:',
      '- Pick exactly ONE dynamic palette from the list below: "Status" for threshold bands, "Temperature" for intensity, "Complementary" for divergence, "Negative"/"Positive" for adverse/favorable values, or "Cool"/"Warm"/"Gray" for neutral magnitude.',
      `- Use exactly ${stepsCount} step${
        stepsCount === 1 ? '' : 's'
      }; every \`steps[*].color\` hex MUST come from that one palette preview line exactly as written.`,
      '- Step thresholds are data values, not display labels; keep them in the same unit and scale as the metric column. For rates, do not assume per-second thresholds unless the ES|QL query computes per-second values.',
      '- Keep palette order by default; to reverse, reverse the `steps` colors yourself. There is no `reverse` field.',
      ''
    );
  }

  if (supportsCategorical) {
    lines.push(
      'CATEGORICAL MAPPING — pick a palette by id:',
      '- Set `color: { mode: "categorical", palette: "<palette id>", mapping: [] }` and let Lens auto-assign a distinct color per distinct value at render time.',
      '- The `palette` value MUST be one of the categorical palette ids listed below verbatim (e.g. `"default"`, `"severity"`).',
      '- Leave `mapping: []` by default. Only define explicit `mapping[]` entries when the user names specific values to color.',
      '- When the user does name explicit values, use `color: { type: "color_code", value: "#hex" }` for each entry, drawing the hex from one of the palettes below.',
      ''
    );
  }

  if (supportsDynamic) {
    lines.push(
      `Available dynamic palettes (canonical ${stepsCount}-stop previews from the Lens UI palette picker, sized to match the ${stepsCount} \`steps\` a ${chartType} chart uses when explicit steps apply):`,
      ...getDynamicPalettePreviews(stepsCount),
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
