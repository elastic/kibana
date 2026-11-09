/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexSchema } from './schema';

export interface CandidateQuery {
  index: string;
  family: string;
  query: string;
}

const quote = (value: string): string => `"${value.replace(/"/g, '\\"')}"`;

/**
 * Template families, instantiated against fields of compatible type drawn from the live mapping
 * and literals sampled from the data.
 *
 * The families are chosen to cover the policy surface the instruction template actually talks
 * about (LIMIT discipline, BUCKET, CASE, DISSECT, named time parameters) rather than to maximise
 * count: the stratification step caps each family so the corpus does not become 80% `STATS … BY`.
 */
export const instantiateTemplates = (schema: IndexSchema): CandidateQuery[] => {
  const { index } = schema;
  const candidates: CandidateQuery[] = [];
  const add = (family: string, query: string) => candidates.push({ index, family, query });

  const keywords = schema.keywordFields.filter((field) => schema.sampleValues[field]?.length);
  const numerics = schema.numericFields.filter((field) => field in schema.medians);
  const [date] = schema.dateFields;

  for (const field of keywords.slice(0, 8)) {
    const [value] = schema.sampleValues[field];
    add('filter-keep', `FROM ${index}\n| WHERE ${field} == ${quote(value)}\n| LIMIT 20`);
    add(
      'count-filtered',
      `FROM ${index}\n| WHERE ${field} == ${quote(value)}\n| STATS matches = COUNT(*)`
    );
    add(
      'stat-by-dimension',
      `FROM ${index}\n| STATS events = COUNT(*) BY ${field}\n| SORT events DESC\n| LIMIT 10`
    );
    add('distinct-count', `FROM ${index}\n| STATS unique_values = COUNT_DISTINCT(${field})`);
  }

  for (const field of numerics.slice(0, 6)) {
    add(
      'single-stat',
      `FROM ${index}\n| STATS average = AVG(${field}), maximum = MAX(${field}), minimum = MIN(${field})`
    );
    add(
      'range-filter',
      `FROM ${index}\n| WHERE ${field} > ${schema.medians[field]}\n| STATS above_median = COUNT(*)`
    );
    add('top-n', `FROM ${index}\n| SORT ${field} DESC\n| KEEP ${field}\n| LIMIT 5`);
  }

  for (const keyword of keywords.slice(0, 4)) {
    for (const numeric of numerics.slice(0, 3)) {
      add(
        'stat-numeric-by-dimension',
        `FROM ${index}\n| STATS total = SUM(${numeric}), average = AVG(${numeric}) BY ${keyword}\n| SORT total DESC\n| LIMIT 10`
      );
      add(
        'case-bucketing',
        `FROM ${index}\n| EVAL size_class = CASE(${numeric} < ${schema.medians[numeric]}, "small", "large")\n| STATS documents = COUNT(*) BY size_class, ${keyword}\n| SORT documents DESC\n| LIMIT 10`
      );
    }
  }

  if (keywords.length >= 2) {
    const [first, second] = keywords;
    add(
      'two-dimension',
      `FROM ${index}\n| STATS events = COUNT(*) BY ${first}, ${second}\n| SORT events DESC\n| LIMIT 10`
    );
  }

  if (numerics.length >= 2) {
    const [first, second] = numerics;
    add(
      'ratio',
      `FROM ${index}\n| WHERE ${second} > 0\n| EVAL ratio = ${first}::double / ${second}::double\n| STATS average_ratio = AVG(ratio)`
    );
  }

  if (date) {
    add(
      'time-bucket',
      `FROM ${index}\n| STATS events = COUNT(*) BY day = BUCKET(${date}, 1 day)\n| SORT day ASC\n| LIMIT 30`
    );
    for (const numeric of numerics.slice(0, 2)) {
      add(
        'time-series-stat',
        `FROM ${index}\n| STATS average = AVG(${numeric}) BY day = BUCKET(${date}, 1 day)\n| SORT day ASC\n| LIMIT 30`
      );
    }
    for (const keyword of keywords.slice(0, 2)) {
      add(
        'time-bucket-by-dimension',
        `FROM ${index}\n| STATS events = COUNT(*) BY day = BUCKET(${date}, 1 day), ${keyword}\n| SORT events DESC\n| LIMIT 15`
      );
    }
  }

  addHardFamilies({ schema, add });

  return candidates;
};

/**
 * Second tier of families: multi-stage pipelines, post-aggregation filters, ratios of filtered
 * counts, string extraction and period-over-period comparisons.
 *
 * The first tier turned out to be saturated — the harness solved 95% of it on the first try, so
 * those examples cannot show an improvement or a regression. These shapes are the ones that
 * actually fail today: they need the model to order several stages correctly rather than fill in
 * one template.
 */
const addHardFamilies = ({
  schema,
  add,
}: {
  schema: IndexSchema;
  add: (family: string, query: string) => void;
}): void => {
  const { index } = schema;
  const keywords = schema.keywordFields.filter((field) => schema.sampleValues[field]?.length);
  const numerics = schema.numericFields.filter((field) => field in schema.medians);
  const [date] = schema.dateFields;
  const [text] = schema.textFields;

  for (const keyword of keywords.slice(0, 4)) {
    // post-aggregation filter: the classic HAVING shape, which needs two WHERE stages
    add(
      'having-filter',
      `FROM ${index}\n| STATS events = COUNT(*) BY ${keyword}\n| WHERE events > 1\n| SORT events DESC, ${keyword} ASC\n| LIMIT 10`
    );

    const values = schema.sampleValues[keyword];
    if (values.length >= 2) {
      // ratio of two filtered counts: the success-rate shape, needs CASE inside STATS
      add(
        'filtered-ratio',
        `FROM ${index}\n| EVAL is_first = CASE(${keyword} == "${values[0]}", 1, 0), is_second = CASE(${keyword} == "${values[1]}", 1, 0)\n| STATS first_count = SUM(is_first), second_count = SUM(is_second)\n| EVAL share = first_count::double / (first_count + second_count)::double`
      );
    }

    for (const numeric of numerics.slice(0, 2)) {
      add(
        'percentile-by-dimension',
        `FROM ${index}\n| STATS p95 = PERCENTILE(${numeric}, 95), median = MEDIAN(${numeric}) BY ${keyword}\n| WHERE p95 > ${schema.medians[numeric]}\n| SORT p95 DESC\n| LIMIT 5`
      );
      add(
        'multi-stage',
        `FROM ${index}\n| WHERE ${numeric} IS NOT NULL\n| STATS total = SUM(${numeric}), events = COUNT(*) BY ${keyword}\n| EVAL per_event = total::double / events::double\n| WHERE events > 1\n| SORT per_event DESC\n| LIMIT 5`
      );
    }
  }

  if (keywords.length >= 2 && numerics.length >= 1) {
    const [first, second] = keywords;
    const [numeric] = numerics;
    add(
      'grouped-share',
      `FROM ${index}\n| STATS subtotal = SUM(${numeric}) BY ${first}, ${second}\n| SORT subtotal DESC\n| LIMIT 15`
    );
  }

  if (date && keywords.length >= 1) {
    const [keyword] = keywords;
    add(
      'period-comparison',
      `FROM ${index}\n| EVAL day = DATE_TRUNC(1 day, ${date})\n| STATS events = COUNT(*) BY day, ${keyword}\n| STATS busiest_day_events = MAX(events) BY ${keyword}\n| SORT busiest_day_events DESC\n| LIMIT 5`
    );
    if (numerics.length >= 1) {
      add(
        'bucketed-ratio',
        `FROM ${index}\n| EVAL hour = DATE_TRUNC(1 hour, ${date})\n| STATS events = COUNT(*), measured = SUM(${numerics[0]}) BY hour\n| EVAL per_event = measured::double / events::double\n| SORT per_event DESC\n| LIMIT 10`
      );
    }
  }

  if (text) {
    add(
      'text-extraction',
      `FROM ${index}\n| DISSECT ${text} "%{} duration: %{duration} ms%{}"\n| EVAL duration_ms = TO_DOUBLE(duration)\n| WHERE duration_ms IS NOT NULL\n| STATS average_duration = AVG(duration_ms), slowest = MAX(duration_ms)`
    );
  }

  for (const ip of schema.ipFields.slice(0, 1)) {
    add(
      'ip-filter',
      `FROM ${index}\n| WHERE NOT CIDR_MATCH(${ip}, "10.0.0.0/8")\n| STATS events = COUNT(*) BY ${ip}\n| SORT events DESC, ${ip} ASC\n| LIMIT 10`
    );
  }
};
