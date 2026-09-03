/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const intentGuidance = `## Intent

\`intent\` is optional typed presentation. Use it instead of restating style in the natural-language \`query\`.

Frequent fields:
- \`intent.legend_statistics\` (\`avg\`, \`min\`, \`max\`, \`total\`, \`count\`, \`median\`, \`last_value\`) when the user wants those series statistics on the legend
- \`sparkline\` for a metric background trend
- \`series_type\` (\`line\`, \`area\`, \`bar\`, \`bar_stacked\`, \`bar_horizontal\`)
- \`x_field\` and \`breakdown_field\`
- \`secondary\` with optional \`compare\` of \`previous\` or \`baseline\`
- \`units\` as a map of field or alias to \`percent\`, \`bytes\`, \`bits\`, \`ms\`, \`s\`, \`us\`, or \`ns\`
- \`thresholds\` for stepped palettes
- \`table\` summary, sort, and hidden columns
- \`gauge\` min, max, and goal
- \`preserve\` to keep named house-style choices on an edit

\`style_overrides\` is a schema-valid partial Lens config for anything \`intent\` cannot say (legend placement, donut hole, data labels). \`style_request\` is a freeform styling sentence. Prefer \`intent\`, then \`style_overrides\`, then \`style_request\`.`;
