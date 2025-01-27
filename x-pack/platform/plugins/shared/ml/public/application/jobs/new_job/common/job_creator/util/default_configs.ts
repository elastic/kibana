/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Field, type Aggregation, EVENT_RATE_FIELD_ID } from '@kbn/ml-anomaly-utils';
import type { IndexPatternTitle } from '../../../../../../../common/types/kibana';
import type {
  Job,
  Datafeed,
  Detector,
} from '../../../../../../../common/types/anomaly_detection_jobs';
import { splitIndexPatternNames } from '../../../../../../../common/util/job_utils';

export function createEmptyJob(): Job {
  // @ts-expect-error incomplete job
  return {
    job_id: '',
    description: '',
    groups: [],
    analysis_config: {
      bucket_span: '',
      detectors: [],
      influencers: [],
    },
    data_description: {
      time_field: '',
    },
  };
}

export function createEmptyDatafeed(indexPatternTitle: IndexPatternTitle): Datafeed {
  // @ts-expect-error incomplete datafeed
  return {
    datafeed_id: '',
    job_id: '',
    indices: splitIndexPatternNames(indexPatternTitle),
    query: {},
  };
}

export function createBasicDetector(agg: Aggregation, field: Field) {
  const dtr: Detector = {
    function: agg.id,
  };

  if (field.id !== EVENT_RATE_FIELD_ID) {
    dtr.field_name = field.id;
  }
  return dtr;
}
