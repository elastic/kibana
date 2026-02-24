/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';

const sharedTitleBestPractices = [
  'TITLE BEST PRACTICES:',
  '- Remove redundant or repetitive titles when the same information is already present in the chart content.',
  '- If a title is needed, make it self-explanatory (metric + subject + dimension/time context) so extra labels can be minimized.',
  '- Avoid duplicating the same phrase across panel title, axis titles, and metric/series labels.',
];

const xyStyleGuidance = [
  'XY CHART STYLE RULES:',
  '- Prefer a clear panel title that describes what is being plotted (for example: "Delayed flights per hour").',
  '- Keep axis titles hidden by default to maximize chart area.',
  '- Set axis title visibility explicitly to false unless axis titles are required to disambiguate units or user explicitly asks for them.',
  '- In practice: set `axis.x.title.visible = false`, `axis.left.title.visible = false`, and `axis.right.title.visible = false` when applicable.',
  '- Keep series labels concise and non-redundant with the panel title.',
];

const metricStyleGuidance = [
  'METRIC CHART STYLE RULES:',
  '- For a single KPI metric chart, omit panel `title` unless the user explicitly asks for one.',
  '- Avoid repeating the same label in both panel title and metric label/sub-label.',
  '- Prefer one clear textual cue near the value (title OR metric label/sub-label), not multiple copies of the same phrase.',
  '- If a title is necessary, make it descriptive and self-contained rather than short or ambiguous.',
];

export const getChartStyleGuidance = (chartType: SupportedChartType): string => {
  const chartSpecificGuidance = (() => {
    switch (chartType) {
      case SupportedChartType.XY:
        return xyStyleGuidance;
      case SupportedChartType.Metric:
        return metricStyleGuidance;
      default:
        return [];
    }
  })();

  if (!chartSpecificGuidance.length) {
    return '';
  }

  return [...sharedTitleBestPractices, '', ...chartSpecificGuidance].join('\n');
};
