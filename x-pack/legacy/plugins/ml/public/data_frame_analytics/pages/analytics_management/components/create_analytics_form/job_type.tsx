/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiFormRow, EuiText } from '@elastic/eui';

import { AnalyticsJobType, JOB_TYPES } from '../../hooks/use_create_analytics_form/state';

interface Props {
  type: AnalyticsJobType;
}

export const JobType: FC<Props> = ({ type }) => {
  const outlierText = i18n.translate('xpack.ml.dataframe.analytics.create.outlierDetectionText', {
    defaultMessage: 'Outlier detection',
  });
  const outlierHelpText = i18n.translate(
    'xpack.ml.dataframe.analytics.create.outlierDetectionHelpText',
    {
      defaultMessage:
        'Outlier detection jobs require a source index that is mapped as a table-like data structure and will only analyze numeric and boolean fields. Please use the advanced editor to apply custom options such as the model memory limit and analysis type. You cannot switch back to this form from the advanced editor.',
    }
  );

  const regressionText = i18n.translate('xpack.ml.dataframe.analytics.create.regressionText', {
    defaultMessage: 'Regression',
  });
  const regressionHelpText = i18n.translate(
    'xpack.ml.dataframe.analytics.create.outlierRegressionHelpText',
    {
      defaultMessage:
        'Regression jobs will only analyze numeric fields. Please use the advanced editor to apply custom options such as the model memory limit and prediction field name. You cannot switch from the advanced editor.',
    }
  );

  return (
    <Fragment>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.analytics.create.jobTypeLabel', {
          defaultMessage: 'Job type',
        })}
        helpText={type === JOB_TYPES.OUTLIER_DETECTION ? outlierHelpText : regressionHelpText}
      >
        <EuiText>{type === JOB_TYPES.OUTLIER_DETECTION ? outlierText : regressionText}</EuiText>
      </EuiFormRow>
    </Fragment>
  );
};
