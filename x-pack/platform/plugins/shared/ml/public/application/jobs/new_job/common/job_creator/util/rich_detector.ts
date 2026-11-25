/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Field, Aggregation, SplitField } from '@kbn/ml-anomaly-utils';
import type { Detector, CustomRule } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import { createBasicDetector } from './default_configs';

/** A detector with its function and fields, as edited in the advanced detector list. */
export interface RichDetector {
  agg: Aggregation | null;
  field: SplitField;
  byField: SplitField;
  overField: SplitField;
  partitionField: SplitField;
  excludeFrequent: estypes.MlExcludeFrequent | null;
  description: string | null;
  customRules: CustomRule[] | null;
  useNull: boolean | null;
}

/** Creates a detector config and its rich detector from the advanced detector settings. */
export const createRichDetector = (
  agg: Aggregation,
  field: Field,
  byField: SplitField,
  overField: SplitField,
  partitionField: SplitField,
  excludeFrequent: estypes.MlExcludeFrequent | null,
  description: string | null,
  customRules: CustomRule[] | null,
  useNull: boolean | null
): { detector: Detector; richDetector: RichDetector } => {
  const detector: Detector = createBasicDetector(agg, field);

  if (byField !== null) {
    detector.by_field_name = byField.id;
  }
  if (overField !== null) {
    detector.over_field_name = overField.id;
  }
  if (partitionField !== null) {
    detector.partition_field_name = partitionField.id;
  }
  if (excludeFrequent !== null) {
    detector.exclude_frequent = excludeFrequent;
  }
  if (description !== null) {
    detector.detector_description = description;
  }
  if (customRules !== null) {
    detector.custom_rules = customRules;
  }
  if (useNull !== null) {
    detector.use_null = useNull;
  }

  const richDetector: RichDetector = {
    agg,
    field,
    byField,
    overField,
    partitionField,
    excludeFrequent,
    description,
    customRules,
    useNull,
  };

  return { detector, richDetector };
};
