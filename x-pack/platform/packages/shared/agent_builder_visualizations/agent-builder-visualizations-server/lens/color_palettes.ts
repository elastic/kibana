/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getPalettes } from '@kbn/palettes';
import { chartTypeRegistry } from './chart_type_registry';
import type { VisualizationConfig } from './types';

/**
 * Shared color registry, in three parts:
 * - {@link colorDesignPromptContent}: when color adds meaning and how to choose a
 *   palette. Shared by every role.
 * - {@link getPaletteCatalogPromptContent}: the actual Kibana palette catalog
 *   (names, ids, colors) built from `@kbn/palettes`. Shared by every role.
 * - {@link getColorConfigPromptContent}: how to express palette choices in Lens
 *   config, plus the catalog subset the chart type needs. Lens config author only.
 */

/**
 * Number of color stops sampled from each palette in catalog previews.
 */
const CATALOG_PREVIEW_STEPS = 5;

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
      colors: palette.colors(CATALOG_PREVIEW_STEPS),
    })
  );

export const colorDesignPromptContent = `COLOR GUIDANCE:
- Add color only when it adds meaning: status colors for meaningful thresholds, intensity colors for magnitude, and one consistent color for the same category wherever it appears across charts. Neutral data with no useful color meaning stays uncolored.
- Choose palettes from the Kibana palette catalog, never invented colors or legacy palettes: "Status" for threshold bands, "Temperature" for intensity, "Complementary" for divergence, "Negative"/"Positive" for adverse/favorable values, "Cool"/"Warm"/"Gray" for neutral magnitude, and a categorical palette (e.g. "default", "severity") for distinct categories.
- Thresholds are data values in the metric's own unit and scale. When only the colors change, keep the existing thresholds.
- Preserve colors explicitly requested by the user or carrying clear semantic meaning, such as status/severity or the same named category across charts. A saved hex value or custom mapping alone does not establish intent. During Prettify, reset color overrides that do not meet these exceptions according to the chart-specific defaults; do not replace them with another arbitrary color.`;

/**
 * The Kibana palette catalog for agents: names, ids, and color previews drawn
 * from Kibana's own palette definitions.
 */
export const getPaletteCatalogPromptContent = (): string =>
  [
    'KIBANA PALETTE CATALOG (from Kibana palette definitions; legacy palettes excluded):',
    '',
    `Gradient palettes — for threshold bands and magnitude (${CATALOG_PREVIEW_STEPS}-stop previews; charts may use fewer or more steps sampled from the same palette):`,
    ...getDynamicPalettePreviews(CATALOG_PREVIEW_STEPS),
    '',
    `Categorical palettes — for distinct categories (${CATALOG_PREVIEW_STEPS}-color previews; configs reference the id, not the name):`,
    ...getCategoricalPalettePreviews(),
  ].join('\n');

/** Number of explicit color steps on an existing single-metric config, 0 when none. */
const getExistingStepsCount = (existingConfig?: VisualizationConfig | null): number => {
  const steps = get(existingConfig, ['metric', 'color', 'steps']);
  return Array.isArray(steps) ? steps.length : 0;
};

/**
 * Returns color configuration guidance for the Lens config prompt: the default
 * policy, the chart type's `coloringRules` from the registry, and — when the
 * chart supports dynamic/categorical coloring — the mechanics and the palette
 * previews mirroring the Lens palette pickers, sized to the chart's step count.
 */
export const getColorConfigPromptContent = (
  chartType: SupportedChartType,
  existingConfig?: VisualizationConfig | null
): string => {
  const config = chartTypeRegistry[chartType].prompt.config;
  const coloringRules = config?.coloringRules ?? [];
  const coloringOptions = config?.options?.coloring;
  const dynamicColoringOptions = coloringOptions?.dynamic;
  const supportsDynamic = dynamicColoringOptions !== undefined;
  const supportsCategorical = coloringOptions?.categorical ?? false;

  if (!coloringRules.length && !supportsDynamic && !supportsCategorical) {
    return '';
  }

  const stepsCount = dynamicColoringOptions?.recommendedStepCount ?? CATALOG_PREVIEW_STEPS;
  const existingStepsCount = getExistingStepsCount(existingConfig);
  const previewStepCounts = [...new Set([stepsCount, existingStepsCount].filter(Boolean))];
  const lines: string[] = ['COLOR CONFIGURATION RULES:', ''];

  if (supportsDynamic || supportsCategorical) {
    lines.push(
      'DEFAULT POLICY:',
      '- Prefer Lens defaults for unknown-scale data: use `color: { type: "auto" }` or omit `color` when Lens can calculate better thresholds at render time.',
      '- Generate explicit numeric `steps` only when the chart-specific rules allow it, or when the user asks for a custom palette or exact thresholds.',
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
      '- Pick exactly ONE dynamic palette from the list below, following the color guidance on which palette fits which meaning.',
      existingStepsCount && existingStepsCount !== stepsCount
        ? `- Use ${stepsCount} steps for new bands. When only recoloring existing bands, keep their ${existingStepsCount} steps and thresholds.`
        : `- Use exactly ${stepsCount} step${stepsCount === 1 ? '' : 's'}.`,
      '- Every `steps[*].color` hex MUST come from the palette preview whose stop count matches your number of steps, exactly as written.',
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
    for (const previewSteps of previewStepCounts) {
      lines.push(
        `Available dynamic palettes (${previewSteps}-stop previews from the Lens UI palette picker; use for ${previewSteps} bands):`,
        ...getDynamicPalettePreviews(previewSteps),
        ''
      );
    }
  }

  if (supportsCategorical) {
    lines.push(
      `Available categorical palettes (${CATALOG_PREVIEW_STEPS}-color preview of each palette from the Lens UI color-mapping picker; pass the id, not the name):`,
      ...getCategoricalPalettePreviews()
    );
  }

  return lines.join('\n').trimEnd();
};
