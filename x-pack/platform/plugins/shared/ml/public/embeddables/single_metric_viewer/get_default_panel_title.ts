/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';

export const getDefaultSingleMetricViewerPanelTitle = (jobId: JobId) =>
  i18n.translate('xpack.ml.singleMetricViewerEmbeddable.title', {
    defaultMessage: 'ML single metric viewer chart for {jobId}',
    values: { jobId },
  });
