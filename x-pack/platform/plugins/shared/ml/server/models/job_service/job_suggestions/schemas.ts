/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

export const dataProfileSchema = lazySchema(() =>
  z.object({
    datasetSummary: z
      .string()
      .describe('One or two sentences describing what kind of data this index holds.'),
    domain: z
      .string()
      .describe(
        'The area the data belongs to, for example web traffic, security, infrastructure metrics, application logs or business events.'
      ),
    entityFields: z
      .array(z.string())
      .describe('Fields which identify the things being observed, for example hosts or users.'),
    measureFields: z
      .array(z.string())
      .describe('Numeric fields which measure behaviour, for example bytes or response time.'),
    behavioursOfInterest: z
      .array(z.string())
      .describe(
        'Behaviours which would be worth detecting unusual changes in, written in plain language.'
      ),
  })
);

export type DataProfile = z.infer<typeof dataProfileSchema>;

const detectorSchema = lazySchema(() =>
  z.object({
    function: z
      .string()
      .describe('The anomaly detection function, for example high_mean, rare or low_count.'),
    field_name: z
      .string()
      .optional()
      .describe('The field the function applies to, when it needs one.'),
    by_field_name: z.string().optional(),
    over_field_name: z.string().optional(),
    partition_field_name: z.string().optional(),
    detector_description: z
      .string()
      .optional()
      .describe('A short technical description of what the detector measures.'),
  })
);

export const jobCandidateSchema = lazySchema(() =>
  z.object({
    title: z
      .string()
      .describe(
        'A short plain language name for what the job looks for, for example "Unusual spikes in failed logins per user". No technical jargon.'
      ),
    description: z
      .string()
      .describe(
        'One or two plain language sentences saying what unusual behaviour the job finds and why it matters. No technical jargon.'
      ),
    rationale: z
      .string()
      .describe('Why these detectors, split fields and bucket span suit this data.'),
    bucket_span: z.string().describe('The analysis interval, for example 15m or 1h.'),
    detectors: z.array(detectorSchema).min(1).max(4),
    influencers: z
      .array(z.string())
      .max(8)
      .describe('Fields which help explain an anomaly. Must be keyword or ip fields.'),
    categorization_field_name: z
      .string()
      .optional()
      .describe(
        'Only for log message categorization. A text field. The detector must then be count or rare by mlcategory.'
      ),
    datafeed_query: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'An Elasticsearch query filtering the source documents. Omit to analyse all of them.'
      ),
  })
);

export type JobCandidate = z.infer<typeof jobCandidateSchema>;
export type CandidateDetector = z.infer<typeof detectorSchema>;

export const proposeJobsSchema = lazySchema(() =>
  z.object({
    candidates: z.array(jobCandidateSchema).min(1),
  })
);
