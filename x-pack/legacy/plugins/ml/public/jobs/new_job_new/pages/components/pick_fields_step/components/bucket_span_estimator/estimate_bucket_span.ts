/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import { JobCreatorContext } from '../../../job_creator_context';
import { EVENT_RATE_FIELD_ID } from '../../../../../../../../common/types/fields';
import { isMultiMetricJobCreator, isPopulationJobCreator } from '../../../../../common/job_creator';
import { ml } from '../../../../../../../services/ml_api_service';
import { useKibanaContext } from '../../../../../../../contexts/kibana';

export enum ESTIMATE_STATUS {
  NOT_RUNNING,
  RUNNING,
}

export function useEstimateBucketSpan() {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const kibanaContext = useKibanaContext();

  const [status, setStatus] = useState(ESTIMATE_STATUS.NOT_RUNNING);

  const data = {
    aggTypes: jobCreator.aggregations.map(a => a.dslName),
    duration: {
      start: jobCreator.start,
      end: jobCreator.end,
    },
    fields: jobCreator.fields.map(f => (f.id === EVENT_RATE_FIELD_ID ? null : f.id)),
    index: kibanaContext.currentIndexPattern.title,
    query: kibanaContext.combinedQuery,
    splitField:
      (isMultiMetricJobCreator(jobCreator) || isPopulationJobCreator(jobCreator)) &&
      jobCreator.splitField !== null
        ? jobCreator.splitField.id
        : undefined,
    timeField: kibanaContext.currentIndexPattern.timeFieldName,
  };

  async function estimateBucketSpan() {
    setStatus(ESTIMATE_STATUS.RUNNING);
    const { name, error, message } = await ml.estimateBucketSpan(data);
    setStatus(ESTIMATE_STATUS.NOT_RUNNING);
    if (error === true) {
      let text = '';
      if (message !== undefined) {
        if (typeof message === 'object') {
          text = message.msg || JSON.stringify(message);
        } else {
          text = message;
        }
      }
      toastNotifications.addDanger({
        title: i18n.translate('xpack.ml.newJob.wizard.estimateBucketSpanError', {
          defaultMessage: `Bucket span estimation error`,
        }),
        text,
      });
    } else {
      jobCreator.bucketSpan = name;
      jobCreatorUpdate();
    }
  }
  return { status, estimateBucketSpan };
}
