/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import jobCreationRecipes from '../../../agent_builder/skills/anomaly_detection/references/job_creation_recipes.md.text';
import { HIGH_CARDINALITY_THRESHOLD } from './constants';
import type { DataProfile, JobCandidate } from './schemas';
import type { EvidenceField, IndexEvidence } from './types';

export type PromptMessage = [role: 'system' | 'user', content: string];

const PROMPT_SAMPLE_DOC_COUNT = 10;

// The skill's recipes start with API call sequences meant for the agent's tools.
// Only the worked examples are useful here.
const recipeExamples = jobCreationRecipes.includes('## Recipe 1')
  ? jobCreationRecipes.slice(jobCreationRecipes.indexOf('## Recipe 1'))
  : jobCreationRecipes;

const DETECTOR_GUIDANCE = `
## Choosing detectors

- Count functions: count, non_zero_count, distinct_count. Use non_zero_count (or non_null_sum for sums) when
  documents arrive intermittently, because empty buckets are then expected rather than anomalous. Use count when
  documents normally arrive in every bucket and a drop to zero would be an outage.
- Metric functions work on numeric fields: mean, median, min, max, sum, varp. Prefer the one-sided high_ or low_
  variants when only one direction matters. A faster response time is never a problem, so use high_mean for latency.
- rare finds values of a field which seldom occur. freq_rare finds the members of a population which repeatedly cause
  rare values, and requires an over_field_name.
- info_content measures the entropy of text, which is useful for random looking domain names or encoded commands.
  Prefer high_info_content.
- lat_long detects unusual geographic locations and needs a geo_point field_name.
- time_of_day and time_of_week detect activity at unusual times and do not depend on counts or values.

## Splitting

- by_field_name compares each entity with its own history.
- over_field_name (population analysis) compares each entity with its peers in the same bucket.
- partition_field_name builds a fully independent model for each value, with its own score normalisation.
- Prefer partition_field_name to by_field_name when splitting. Use by_field_name only for rare and freq_rare, for
  mlcategory, and together with over_field_name in population jobs.
- Only split on keyword or ip fields. Never split on text fields.
- Avoid splitting on a field with more than ${HIGH_CARDINALITY_THRESHOLD} distinct values, because the model memory
  needed becomes very large.

## Log message categorization

- For a text field holding free-text log messages, set categorization_field_name to that field and use a count (or
  rare) detector with by_field_name set to mlcategory.

## Other rules

- Every field you reference must appear in the field list you are given, with a suitable type.
- Choose bucket_span to match how often data arrives and how quickly problems matter. 15m is a good default for dense
  data, and use 1h or more for sparse data or for rare detectors.
- Influencers must be keyword or ip fields, and should include the split fields. Use at most three.
- Use at most four detectors in one job and keep each job focused on one kind of behaviour.
- Make the architecture decisions yourself, and explain them in the rationale.
- Do not include job ids, model memory limits or time fields. They are added later.
`;

const formatField = (field: EvidenceField): string => {
  const details: string[] = [];
  if (field.cardinality !== undefined) details.push(`${field.cardinality} distinct values`);
  if (field.nullRate !== undefined) details.push(`${Math.round(field.nullRate * 100)}% missing`);
  if (field.numericStats) {
    const { min, max, avg } = field.numericStats;
    details.push(`min ${min}, max ${max}, avg ${Number(avg.toFixed(2))}`);
  }
  if (field.topValues?.length) details.push(`common values: ${field.topValues.join(', ')}`);
  return `- ${field.name} (${field.kind}${details.length ? `; ${details.join('; ')}` : ''})`;
};

export const formatEvidence = (evidence: IndexEvidence): string => {
  const { index, timeField, timeRange, docCount, emptyBucketFraction, fields } = evidence;
  const lines = [
    `Index: ${index}`,
    `Time field: ${timeField}`,
    `Analysed range: ${new Date(timeRange.start).toISOString()} to ${new Date(
      timeRange.end
    ).toISOString()}`,
    `Documents in range: ${docCount}`,
    `Share of time buckets with no documents: ${Math.round(emptyBucketFraction * 100)}% (${
      emptyBucketFraction > 0.2 ? 'sparse data' : 'dense data'
    })`,
    '',
    'Fields:',
    ...fields.map(formatField),
    '',
    'Sample documents:',
    ...evidence.sampleDocs.slice(0, PROMPT_SAMPLE_DOC_COUNT).map((doc) => JSON.stringify(doc)),
  ];
  if (evidence.recognizerModules.length > 0) {
    lines.push(
      '',
      'Prebuilt Elastic ML modules which match this data (for context only):',
      ...evidence.recognizerModules.map(({ id, title }) => `- ${id}: ${title}`)
    );
  }
  return lines.join('\n');
};

export const createInterpretDataPrompt = (evidence: IndexEvidence): PromptMessage[] => [
  [
    'system',
    `You are an expert in Elastic machine learning anomaly detection. You are shown facts about an index.
Work out what the data represents and which behaviours would be worth watching for unusual changes. Only mention
fields which appear in the field list.`,
  ],
  ['user', formatEvidence(evidence)],
];

export const createProposeJobsPrompt = ({
  evidence,
  profile,
  count,
}: {
  evidence: IndexEvidence;
  profile: DataProfile;
  count: number;
}): PromptMessage[] => [
  [
    'system',
    `You are an expert in Elastic machine learning anomaly detection. You propose anomaly detection jobs which suit
the data you are shown.

Write the title and description for people who do not know machine learning terminology.
${DETECTOR_GUIDANCE}
## Worked examples of complete jobs

These examples are for the structure of a job. Where they split with by_field_name, you should instead use
partition_field_name, unless the rules above say by_field_name is needed.

${recipeExamples}`,
  ],
  [
    'user',
    `${formatEvidence(evidence)}

<data-profile>
${JSON.stringify(profile, null, 2)}
</data-profile>

Propose ${count} different anomaly detection jobs for this data. Each should watch for a different kind of unusual
behaviour, and together they should cover the most valuable behaviours in the data-profile.`,
  ],
];

export const createReviseCandidatePrompt = ({
  evidence,
  candidate,
  problems,
}: {
  evidence: IndexEvidence;
  candidate: JobCandidate;
  problems: string[];
}): PromptMessage[] => [
  [
    'system',
    `You are an expert in Elastic machine learning anomaly detection. A proposed job failed validation. Fix the job so
the problems are resolved, while keeping its purpose. If it cannot be fixed with the available fields, change it as
little as possible.
${DETECTOR_GUIDANCE}`,
  ],
  [
    'user',
    `${formatEvidence(evidence)}

<job>
${JSON.stringify(candidate, null, 2)}
</job>

<problems>
${problems.map((problem) => `- ${problem}`).join('\n')}
</problems>

Return the corrected job.`,
  ],
];
