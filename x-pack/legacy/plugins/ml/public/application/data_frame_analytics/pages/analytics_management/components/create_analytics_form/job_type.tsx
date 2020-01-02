/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiFormRow, EuiSelect } from '@elastic/eui';

import { AnalyticsJobType, JOB_TYPES } from '../../hooks/use_create_analytics_form/state';

interface Props {
  type: AnalyticsJobType;
  setFormState: React.Dispatch<React.SetStateAction<any>>;
}

export const JobType: FC<Props> = ({ type, setFormState }) => {
  const outlierHelpText = i18n.translate(
    'xpack.ml.dataframe.analytics.create.outlierDetectionHelpText',
    {
      defaultMessage:
        'Outlier detection jobs require a source index that is mapped as a table-like data structure and will only analyze numeric and boolean fields. Please use the advanced editor to add custom options to the configuration.',
    }
  );

  const regressionHelpText = i18n.translate(
    'xpack.ml.dataframe.analytics.create.outlierRegressionHelpText',
    {
      defaultMessage:
        'Regression jobs will only analyze numeric fields. Please use the advanced editor to apply custom options such as the prediction field name.',
    }
  );

  const classificationHelpText = i18n.translate(
    'xpack.ml.dataframe.analytics.create.classificationHelpText',
    {
      defaultMessage:
        'Classification jobs require a source index that is mapped as a table-like data structure and supports fields that are numeric, boolean, text, keyword or ip. Please use the advanced editor to apply custom options such as the prediction field name.',
    }
  );

  const helpText = {
    outlier_detection: outlierHelpText,
    regression: regressionHelpText,
    classification: classificationHelpText,
  };

  return (
    <Fragment>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.analytics.create.jobTypeLabel', {
          defaultMessage: 'Job type',
        })}
        helpText={type !== undefined ? helpText[type] : ''}
      >
        <EuiSelect
          options={Object.values(JOB_TYPES).map(jobType => ({
            value: jobType,
            text: jobType.replace(/_/g, ' '),
          }))}
          value={type}
          hasNoInitialSelection={true}
          onChange={e => {
            const value = e.target.value as AnalyticsJobType;
            setFormState({ previousJobType: type, jobType: value });
          }}
          data-test-subj="mlAnalyticsCreateJobFlyoutJobTypeSelect"
        />
      </EuiFormRow>
    </Fragment>
  );
};
