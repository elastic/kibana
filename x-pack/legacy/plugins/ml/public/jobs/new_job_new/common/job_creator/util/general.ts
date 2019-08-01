/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Detector } from '../configs';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';

export function getRichDetectors(detectors: Detector[]) {
  return detectors.map(d => {
    return {
      agg: newJobCapsService.getAggById(d.function),
      field: d.field_name !== undefined ? newJobCapsService.getFieldById(d.field_name) : null,
      byField:
        d.by_field_name !== undefined ? newJobCapsService.getFieldById(d.by_field_name) : null,
      overField:
        d.over_field_name !== undefined ? newJobCapsService.getFieldById(d.over_field_name) : null,
      partitionField:
        d.partition_field_name !== undefined
          ? newJobCapsService.getFieldById(d.partition_field_name)
          : null,
    };
  });
}
