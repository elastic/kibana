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
 * Shared across every chart type. Lens JSON schema still lists these ids for
 * existing saved charts; new configs must not pick them.
 */
export const LEGACY_PALETTE_BAN =
  'Never introduce or switch to legacy palette IDs (`eui_amsterdam`, `kibana_v7_legacy`, or `elastic_brand_2023`).';

export const INVENTED_COLOR_BAN =
  'Drop invented static hex colors, per-value `color_code` mappings, and legacy palettes unless the user asked for those colors. Omit `color` so Lens uses its default.';

const DEFAULT_POLICY_LINES = [
  'DEFAULT POLICY:',
  '- Prefer Lens defaults for unknown-scale data: use `color: { type: "auto" }` or omit `color` when Lens can calculate better thresholds at render time.',
  '- Generate explicit numeric `steps` only when the chart-specific rules allow it, or when the user asks for a custom palette or exact thresholds.',
  '- Do not color neutral data with no useful color meaning.',
  '- Chart-specific coloring rules below override this policy where they differ.',
];

const SHARED_DYNAMIC_STEP_COUNT = 5;

const getSharedStepCountLine = (): string => {
  const summary = Object.entries(chartTypeRegistry)
    .flatMap(([chartType, { prompt }]) => {
      const count = prompt.config?.options?.coloring?.dynamic?.recommendedStepCount;
      return count === undefined ? [] : [`${chartType}: ${count}`];
    })
    .join(', ');

  return `- Step count by chart type: ${summary}. Every \`steps[*].color\` hex MUST come from the ${SHARED_DYNAMIC_STEP_COUNT}-stop preview line below; for charts with fewer steps, use the first N colors.`;
};

const getDynamicStepsLines = (stepCountLine: string): string[] => [
  'DYNAMIC STEPS — mechanics for when the rules above call for explicit `steps`:',
  '- Pick exactly ONE dynamic palette from the list below: "Status" for threshold bands, "Temperature" for intensity, "Complementary" for divergence, "Negative"/"Positive" for adverse/favorable values, or "Cool"/"Warm"/"Gray" for neutral magnitude.',
  stepCountLine,
  '- Step thresholds are data values, not display labels; keep them in the same unit and scale as the metric column. For rates, do not assume per-second thresholds unless the ES|QL query computes per-second values.',
  '- Keep palette order by default; to reverse, reverse the `steps` colors yourself. There is no `reverse` field.',
  '',
];

/** Shared palette bans + default policy. Review also compiles mechanics once under `### shared`. */
export const getSharedColorPalettesPromptContent = ({
  includeMechanics = false,
}: { includeMechanics?: boolean } = {}): string => {
  const lines: string[] = [
    'COLOR PALETTE RULES:',
    '',
    `- ${LEGACY_PALETTE_BAN}`,
    `- ${INVENTED_COLOR_BAN}`,
    '',
    ...DEFAULT_POLICY_LINES,
  ];

  if (includeMechanics) {
    lines.push(
      '',
      ...getDynamicStepsLines(getSharedStepCountLine()),
      `Available dynamic palettes (canonical ${SHARED_DYNAMIC_STEP_COUNT}-stop previews from the Lens UI palette picker):`,
      ...getDynamicPalettePreviews(SHARED_DYNAMIC_STEP_COUNT)
    );
  }

  return lines.join('\n').trimEnd();
};

export const getColorPalettesPromptContent = (
  chartType: SupportedChartType,
  { includeShared = true }: { includeShared?: boolean } = {}
): string => {
  const config = chartTypeRegistry[chartType].prompt.config;
  const coloringRules = config?.coloringRules ?? [];
  const coloringOptions = config?.options?.coloring;
  const dynamicColoringOptions = coloringOptions?.dynamic;
  const supportsDynamic = dynamicColoringOptions !== undefined;
  const supportsCategorical = coloringOptions?.categorical ?? false;

  const stepsCount = dynamicColoringOptions?.recommendedStepCount ?? 5;
  const lines: string[] = includeShared ? [getSharedColorPalettesPromptContent(), ''] : [];

  if (!coloringRules.length && !supportsDynamic && !supportsCategorical) {
    return lines.join('\n').trimEnd();
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

  if (includeShared && supportsDynamic) {
    lines.push(
      ...getDynamicStepsLines(
        `- Use exactly ${stepsCount} step${
          stepsCount === 1 ? '' : 's'
        }; every \`steps[*].color\` hex MUST come from that one palette preview line exactly as written.`
      )
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

  if (includeShared && supportsDynamic) {
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
