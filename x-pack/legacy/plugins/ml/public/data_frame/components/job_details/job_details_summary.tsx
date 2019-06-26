/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiFieldText, EuiFormRow } from '@elastic/eui';

import { JobDetailsExposedState } from './job_details_form';

export const JobDetailsSummary: SFC<JobDetailsExposedState> = React.memo(
  ({ createIndexPattern, jobId, destinationIndex, touched }) => {
    if (touched === false) {
      return null;
    }

    const destinationIndexHelpText = createIndexPattern
      ? i18n.translate('xpack.ml.dataframe.jobDetailsSummary.createIndexPatternMessage', {
          defaultMessage: 'A Kibana index pattern will be created for this job.',
        })
      : '';

    return (
      <Fragment>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.jobDetailsSummary.jobIdLabel', {
            defaultMessage: 'Job id',
          })}
        >
          <EuiFieldText defaultValue={jobId} disabled={true} />
        </EuiFormRow>
        <EuiFormRow
          helpText={destinationIndexHelpText}
          label={i18n.translate('xpack.ml.dataframe.jobDetailsSummary.destinationIndexLabel', {
            defaultMessage: 'Destination index',
          })}
        >
          <EuiFieldText defaultValue={destinationIndex} disabled={true} />
        </EuiFormRow>
      </Fragment>
    );
  }
);
