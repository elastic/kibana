/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';
import { Validation } from '../../../../../common/job_validator';

interface Props {
  children: JSX.Element;
  validation: Validation;
}

export const Description: FC<Props> = memo(({ children, validation }) => {
  const title = i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.bucketSpan.title', {
    defaultMessage: 'Bucket span',
  });
  return (
    <EuiDescribedFormGroup
      idAria="description"
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.bucketSpan.description"
          defaultMessage="Set the interval for time series analysis, typically between 15m to 1h."
        />
      }
    >
      <EuiFormRow
        label={title}
        describedByIds={['description']}
        error={validation.message}
        isInvalid={validation.valid === false}
      >
        {children}
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
