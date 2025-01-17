/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CombinedJob } from '../../../../common/types/anomaly_detection_jobs';
import { isTimeSeriesViewDetector } from '../../../../common/util/job_utils';

export interface ViewableDetector {
  index: number;
  detector_description: string | undefined;
  function: string;
}
export function getViewableDetectors(selectedJob: CombinedJob): ViewableDetector[] {
  const jobDetectors = selectedJob.analysis_config.detectors;
  const viewableDetectors: ViewableDetector[] = [];
  jobDetectors.forEach((dtr, index) => {
    if (isTimeSeriesViewDetector(selectedJob, index)) {
      viewableDetectors.push({
        index,
        detector_description: dtr.detector_description,
        function: dtr.function!,
      });
    }
  });

  return viewableDetectors;
}
