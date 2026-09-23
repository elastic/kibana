/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getPalettes } from '@kbn/palettes';
import { isPlainObject } from 'lodash';
import { chartTypeRegistry } from './chart_type_registry';
import type { VisualizationConfig } from './types';

/**
 * Number of color stops sampled from each categorical palette in previews, and
 * the default band count for dynamic palettes.
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

/** Band count of every stepped color config in an existing visualization, wherever it sits. */
const getExistingStepCounts = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value.flatMap(getExistingStepCounts);
  }
  if (!isPlainObject(value)) {
    return [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    key === 'steps' && Array.isArray(child) && child.length
      ? [child.length]
      : getExistingStepCounts(child)
  );
};

/**
 * Color mechanics for charts that support dynamic or categorical coloring:
 * when to emit explicit steps or mappings, how to express them, and the
 * palette previews sized to the chart's band count (plus the band counts of
 * an existing config being edited). Charts without such support get nothing.
 * Their chart rules hold their whole color policy.
 */
export const getColorConfigPromptContent = (
  chartType: SupportedChartType,
  existingConfig?: VisualizationConfig | null
): string => {
  const { coloring } = chartTypeRegistry[chartType].prompt;
  const supportsDynamic = coloring?.dynamic !== undefined;
  const supportsCategorical = coloring?.categorical ?? false;

  if (!supportsDynamic && !supportsCategorical) {
    return '';
  }

  const stepsCount = coloring?.dynamic?.recommendedStepCount ?? CATALOG_PREVIEW_STEPS;
  const previewStepCounts = [...new Set([stepsCount, ...getExistingStepCounts(existingConfig)])];

  const lines: string[] = [
    'COLOR MECHANICS:',
    '- Prefer Lens defaults for unknown-scale data: `color: { type: "auto" }` or omit `color`. Generate explicit `steps` only when the chart rules above allow it or the user asks for a custom palette or exact thresholds.',
  ];

  if (supportsDynamic && supportsCategorical) {
    lines.push(
      '- Numeric columns use `color: { type: "auto" }` by default, and `color: { type: "dynamic", range, steps: [...] }` only when explicit steps are allowed. Keyword and text columns use `color: { mode: "categorical", palette: "<palette id>", mapping: [] }`. NEVER apply categorical mapping to a numeric column or dynamic steps to a keyword column, and never use the deprecated `type: "legacy_dynamic"`.'
    );
  }

  if (supportsDynamic) {
    const bandCount =
      chartType === SupportedChartType.Gauge
        ? 'the band count from the gauge rules above'
        : `exactly ${stepsCount} step${
            stepsCount === 1 ? '' : 's'
          } for a new color config, or the existing step count when editing one`;
    lines.push(
      `- For explicit \`steps\`, pick exactly ONE palette from the previews below: "Status" for threshold bands, "Temperature" for intensity, "Complementary" for divergence, "Negative"/"Positive" for adverse/favorable values, "Cool"/"Warm"/"Gray" for neutral magnitude. Use ${bandCount}, with every \`steps[*].color\` hex copied from that palette's preview line for that count.`,
      "- Step thresholds are data values in the metric column's unit and scale, not display labels. For rates, do not assume per-second thresholds unless the ES|QL query computes per-second values. Keep palette order. To reverse it, reverse the `steps` colors yourself, since there is no `reverse` field."
    );
  }

  if (supportsCategorical) {
    lines.push(
      '- Categorical `palette` MUST be one of the ids below verbatim (e.g. `"default"`, `"severity"`). Leave `mapping: []` unless the user names specific values to color. In that case use `color: { type: "color_code", value: "#hex" }` per entry, with the hex drawn from one of the palettes below.'
    );
  }

  if (supportsDynamic) {
    for (const previewSteps of previewStepCounts) {
      lines.push(
        '',
        `Dynamic palettes (${previewSteps}-stop previews from the Lens UI palette picker; use for ${previewSteps} bands):`,
        ...getDynamicPalettePreviews(previewSteps)
      );
    }
  }

  if (supportsCategorical) {
    lines.push(
      '',
      `Categorical palettes (${CATALOG_PREVIEW_STEPS}-color preview of each palette from the Lens UI color-mapping picker; pass the id, not the name):`,
      ...getCategoricalPalettePreviews()
    );
  }

  return lines.join('\n');
};
