/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One distinction, three audiences. "Average over time" is a measure (ES|QL
 * AVG). "Show avg/min/max in the legend" is Lens legend.statistics of an
 * already-requested series. Keep these strings in sync.
 */

/** Dashboard / visualization-creation agents that write the `query` field. */
export const seriesStatisticsAgentGuidance = `Two different "average" requests — do not mix them:

- **Measure over time:** "average <field> over time" (e.g. average CPU). The query should average that field. Do not add "in the legend".
- **Legend statistics:** "log volume over time, show avg/min/max" or "trend with avg, min, max". Phrase as "<measure> over time, show avg/min/max in the legend". Use Lens \`xy\`. Those words are presentation — do not ask ES|QL to compute them, and do not pick Vega.`;

/**
 * ES|QL generation. Same full request arrives here; the model must ignore
 * legend-stat clauses when writing the query (prompt thinking, not a stripper).
 */
export const seriesStatisticsEsqlGuidance = `## Average / min / max: measure vs legend

Before writing ES|QL, decide what avg/min/max refers to. Ignore legend-stat wording; keep a field average.

- **Legend statistics — omit from the query:** "in the legend", "legend statistics", or "trend with avg, min, max" when no source field is being averaged (e.g. "log volume over time, show avg/min/max in the legend"). Query only the measure over time (count of logs by time bucket). Do **not** add AVG/MIN/MAX columns or a second \`STATS\` that collapses the buckets.
- **The measure itself:** "average <field> over time" (e.g. average CPU). Use \`AVG\`/\`MIN\`/\`MAX\`(<field>) in a single \`STATS ... BY <time bucket>\`. That is not legend statistics.`;

/** Lens XY config author. */
export const seriesStatisticsLensConfigRule =
  'If the request asks for series statistics *in the legend* (avg, min, max, median, last_value, last_non_null_value, first_value, count, total, standard_deviation, … — any legend.statistics option) without naming a field to aggregate, set legend.statistics to those options and legend.visibility: "visible". If the request is "average <field> over time", bind the AVG column from the query — do not treat that as legend statistics. Never invent statistic columns the query does not emit.';
