/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'crypto';
import type { estypes } from '@elastic/elasticsearch';
import { CREATED_BY_LABEL, JOB_TYPE } from '../../../../common/constants/new_job';
import type {
  SuggestedDatafeedConfig,
  SuggestedJobConfig,
} from '../../../../common/types/job_suggestions';
import { HIGH_CARDINALITY_THRESHOLD, MAX_INFLUENCERS } from './constants';
import type { CandidateDetector, JobCandidate } from './schemas';
import type { EvidenceFieldKind, IndexEvidence } from './types';

const MLCATEGORY = 'mlcategory';
const BUCKET_SPAN_PATTERN = /^[1-9]\d*(s|m|h|d)$/;
const SPLIT_KINDS: EvidenceFieldKind[] = ['keyword', 'ip'];

interface FunctionSpec {
  needsField: boolean;
  fieldKinds?: EvidenceFieldKind[];
  /** Whether the wizards for single and multi metric jobs can build this function. */
  isWizardMetric: boolean;
}

const withDirections = (names: string[]): string[] =>
  names.flatMap((name) => [name, `high_${name}`, `low_${name}`]);

const buildFunctionSpecs = (): Map<string, FunctionSpec> => {
  const specs = new Map<string, FunctionSpec>();
  const add = (names: string[], spec: FunctionSpec) =>
    names.forEach((name) => specs.set(name, spec));

  add(withDirections(['count', 'non_zero_count']), { needsField: false, isWizardMetric: true });
  add(withDirections(['distinct_count']), {
    needsField: true,
    fieldKinds: ['keyword', 'ip', 'numeric'],
    isWizardMetric: true,
  });
  add(withDirections(['mean', 'median', 'sum', 'non_null_sum', 'varp']), {
    needsField: true,
    fieldKinds: ['numeric'],
    isWizardMetric: true,
  });
  add(['min', 'max'], { needsField: true, fieldKinds: ['numeric'], isWizardMetric: true });
  add(['metric'], { needsField: true, fieldKinds: ['numeric'], isWizardMetric: false });
  add(withDirections(['info_content']), {
    needsField: true,
    fieldKinds: ['keyword', 'text'],
    isWizardMetric: false,
  });
  add(['rare', 'freq_rare', 'time_of_day', 'time_of_week'], {
    needsField: false,
    isWizardMetric: false,
  });
  add(['lat_long'], { needsField: true, fieldKinds: ['geo_point'], isWizardMetric: false });
  return specs;
};

const FUNCTION_SPECS = buildFunctionSpecs();

const getDetectorLabel = (detector: CandidateDetector, index: number) =>
  `Detector ${index + 1} (${detector.function})`;

/**
 * Finds everything wrong with a candidate which can be known without running it:
 * unknown functions or fields, fields of the wrong type and splits which are too large.
 * The problems are written so they can be given back to the model as feedback.
 */
export const findCandidateProblems = (
  candidate: JobCandidate,
  evidence: IndexEvidence
): string[] => {
  const problems: string[] = [];
  const fields = new Map(evidence.fields.map((field) => [field.name, field]));
  const { categorization_field_name: categorizationField } = candidate;

  if (!BUCKET_SPAN_PATTERN.test(candidate.bucket_span)) {
    problems.push(
      `bucket_span "${candidate.bucket_span}" is not valid. Use a whole number followed by s, m, h or d.`
    );
  }

  if (categorizationField !== undefined && fields.get(categorizationField)?.kind !== 'text') {
    problems.push(`categorization_field_name "${categorizationField}" must be a text field.`);
  }

  const checkSplitField = (name: string | undefined, role: string, label: string) => {
    if (name === undefined) return;
    if (name === MLCATEGORY && role === 'by_field_name' && categorizationField !== undefined) {
      return;
    }
    const field = fields.get(name);
    if (field === undefined) {
      problems.push(`${label}: ${role} "${name}" is not a field in the index.`);
    } else if (!SPLIT_KINDS.includes(field.kind)) {
      problems.push(
        `${label}: ${role} "${name}" is a ${field.kind} field. Split on keyword or ip fields.`
      );
    } else if ((field.cardinality ?? 0) > HIGH_CARDINALITY_THRESHOLD) {
      problems.push(
        `${label}: ${role} "${name}" has ${field.cardinality} distinct values, which is too many to split on.`
      );
    }
  };

  candidate.detectors.forEach((detector, index) => {
    const label = getDetectorLabel(detector, index);
    const spec = FUNCTION_SPECS.get(detector.function);
    if (spec === undefined) {
      problems.push(`${label}: "${detector.function}" is not a known function.`);
      return;
    }

    if (spec.needsField) {
      const field = detector.field_name !== undefined ? fields.get(detector.field_name) : undefined;
      if (detector.field_name === undefined) {
        problems.push(`${label}: field_name is required.`);
      } else if (field === undefined) {
        problems.push(`${label}: field_name "${detector.field_name}" is not a field in the index.`);
      } else if (spec.fieldKinds && !spec.fieldKinds.includes(field.kind)) {
        problems.push(
          `${label}: field_name "${detector.field_name}" is a ${field.kind} field, but ${
            detector.function
          } needs ${spec.fieldKinds.join(' or ')}.`
        );
      }
    } else if (detector.field_name !== undefined) {
      problems.push(`${label}: field_name must not be set for this function.`);
    }

    if (detector.function === 'rare' && detector.by_field_name === undefined) {
      problems.push(`${label}: by_field_name is required.`);
    }
    if (detector.function === 'freq_rare') {
      if (detector.by_field_name === undefined || detector.over_field_name === undefined) {
        problems.push(`${label}: both by_field_name and over_field_name are required.`);
      }
    }

    checkSplitField(detector.by_field_name, 'by_field_name', label);
    checkSplitField(detector.over_field_name, 'over_field_name', label);
    checkSplitField(detector.partition_field_name, 'partition_field_name', label);
  });

  return problems;
};

// These functions are defined by the field they are split by, so it cannot be a partition field.
const BY_FIELD_FUNCTIONS = new Set(['rare', 'freq_rare']);

/**
 * Splits with partition_field_name where the model used by_field_name.
 * Population jobs (any detector with an over_field_name) are left as they are, as are the cases
 * where a by field is part of the meaning of the detector: rare and freq_rare, and categorization.
 */
export const preferPartitionFields = (candidate: JobCandidate): JobCandidate => {
  if (candidate.detectors.some(({ over_field_name: over }) => over !== undefined)) {
    return candidate;
  }

  return {
    ...candidate,
    detectors: candidate.detectors.map((detector) => {
      const { by_field_name: by, partition_field_name: partition, function: fn } = detector;
      if (
        by === undefined ||
        partition !== undefined ||
        by === MLCATEGORY ||
        BY_FIELD_FUNCTIONS.has(fn)
      ) {
        return detector;
      }
      return { ...detector, by_field_name: undefined, partition_field_name: by };
    }),
  };
};

/**
 * Works out which job wizard produces a configuration. A type is only claimed when the
 * wizard can represent the configuration, otherwise it falls back to advanced.
 */
export const classifyJobType = ({
  detectors,
  categorization_field_name: categorizationField,
}: Pick<JobCandidate, 'detectors' | 'categorization_field_name'>): JOB_TYPE => {
  if (categorizationField !== undefined) {
    return detectors.every(({ by_field_name: by }) => by === MLCATEGORY)
      ? JOB_TYPE.CATEGORIZATION
      : JOB_TYPE.ADVANCED;
  }

  if (detectors.length === 1) {
    const [detector] = detectors;
    if (detector.function === 'lat_long') return JOB_TYPE.GEO;
    if (detector.function === 'rare') return JOB_TYPE.RARE;
  }

  const allWizardMetrics = detectors.every(
    ({ function: fn }) => FUNCTION_SPECS.get(fn)?.isWizardMetric === true
  );
  if (!allWizardMetrics) return JOB_TYPE.ADVANCED;

  // The population wizard has one population field, which every detector shares.
  const overFields = new Set(detectors.map(({ over_field_name: over }) => over));
  if (overFields.size === 1 && !overFields.has(undefined)) {
    return JOB_TYPE.POPULATION;
  }
  if (overFields.size > 1 || !overFields.has(undefined)) return JOB_TYPE.ADVANCED;

  const hasBy = detectors.some(({ by_field_name: by }) => by !== undefined);
  if (hasBy) return JOB_TYPE.ADVANCED;

  const partitions = new Set(detectors.map(({ partition_field_name: partition }) => partition));
  if (detectors.length === 1 && partitions.has(undefined)) return JOB_TYPE.SINGLE_METRIC;
  return partitions.size === 1 ? JOB_TYPE.MULTI_METRIC : JOB_TYPE.ADVANCED;
};

const CREATED_BY: Record<JOB_TYPE, CREATED_BY_LABEL> = {
  [JOB_TYPE.SINGLE_METRIC]: CREATED_BY_LABEL.SINGLE_METRIC,
  [JOB_TYPE.MULTI_METRIC]: CREATED_BY_LABEL.MULTI_METRIC,
  [JOB_TYPE.POPULATION]: CREATED_BY_LABEL.POPULATION,
  [JOB_TYPE.ADVANCED]: CREATED_BY_LABEL.ADVANCED,
  [JOB_TYPE.CATEGORIZATION]: CREATED_BY_LABEL.CATEGORIZATION,
  [JOB_TYPE.RARE]: CREATED_BY_LABEL.RARE,
  [JOB_TYPE.GEO]: CREATED_BY_LABEL.GEO,
};

const describeDetector = ({
  function: fn,
  field_name: field,
  by_field_name: by,
  over_field_name: over,
  partition_field_name: partition,
}: CandidateDetector): string =>
  [
    field ? `${fn}(${field})` : fn,
    by ? `by ${by}` : '',
    over ? `over ${over}` : '',
    partition ? `partitioned by ${partition}` : '',
  ]
    .filter(Boolean)
    .join(' ');

export const generateJobId = (title: string): string => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return `ai-${slug ? `${slug}-` : ''}${randomBytes(3).toString('hex')}`;
};

/**
 * The job wizards add to the datafeed query of the job they open, and expect it to be a bool
 * query, which is what they create themselves.
 */
export const normalizeDatafeedQuery = (
  query: Record<string, unknown> | undefined
): estypes.QueryDslQueryContainer => {
  if (query === undefined || Object.keys(query).length === 0) {
    return { bool: { must: [{ match_all: {} }] } };
  }
  const { bool } = query;
  if (bool === undefined || bool === null || typeof bool !== 'object') {
    return { bool: { must: [query] } } as estypes.QueryDslQueryContainer;
  }
  const { must } = bool as { must?: unknown };
  if (must === undefined || Array.isArray(must)) {
    return query as estypes.QueryDslQueryContainer;
  }
  return { ...query, bool: { ...bool, must: [must] } } as estypes.QueryDslQueryContainer;
};

export interface BuiltJob {
  jobType: JOB_TYPE;
  job: SuggestedJobConfig;
  datafeed: SuggestedDatafeedConfig;
}

/** Assembles the full job and datafeed from a validated candidate. */
export const buildJobAndDatafeed = ({
  candidate,
  evidence,
  jobId,
}: {
  candidate: JobCandidate;
  evidence: IndexEvidence;
  jobId: string;
}): BuiltJob => {
  const fieldKinds = new Map(evidence.fields.map(({ name, kind }) => [name, kind]));
  const isSplittable = (name: string) => SPLIT_KINDS.includes(fieldKinds.get(name) as never);

  const splitFields = candidate.detectors.flatMap(
    ({ by_field_name: by, over_field_name: over, partition_field_name: partition }) =>
      [by, over, partition].filter((name): name is string => name !== undefined)
  );
  // Split fields come first because they matter most. Influencers the model invented are dropped,
  // and the number is capped because job validation warns about more than three.
  const influencers = [...new Set([...splitFields, ...candidate.influencers])]
    .filter((name) => name !== MLCATEGORY && isSplittable(name))
    .slice(0, MAX_INFLUENCERS);

  const jobType = classifyJobType(candidate);
  const detectors: estypes.MlDetector[] = candidate.detectors.map((detector) => ({
    function: detector.function,
    ...(detector.field_name ? { field_name: detector.field_name } : {}),
    ...(detector.by_field_name ? { by_field_name: detector.by_field_name } : {}),
    ...(detector.over_field_name ? { over_field_name: detector.over_field_name } : {}),
    ...(detector.partition_field_name
      ? { partition_field_name: detector.partition_field_name }
      : {}),
    detector_description: detector.detector_description ?? describeDetector(detector),
  }));

  const job: SuggestedJobConfig = {
    job_id: jobId,
    description: `Suggested by AI. ${candidate.detectors.map(describeDetector).join('; ')}.`,
    analysis_config: {
      bucket_span: candidate.bucket_span,
      detectors,
      influencers,
      ...(candidate.categorization_field_name
        ? { categorization_field_name: candidate.categorization_field_name }
        : {}),
    },
    data_description: { time_field: evidence.timeField },
    custom_settings: { created_by: CREATED_BY[jobType] },
  };

  const datafeed: SuggestedDatafeedConfig = {
    datafeed_id: `datafeed-${jobId}`,
    job_id: jobId,
    indices: evidence.index.split(',').map((index) => index.trim()),
    query: normalizeDatafeedQuery(candidate.datafeed_query),
  };

  return { jobType, job, datafeed };
};
