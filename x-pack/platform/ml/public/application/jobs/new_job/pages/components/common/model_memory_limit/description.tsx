/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';
import type { Validation } from '../../../../common/job_validator';

interface Props {
  validation: Validation;
}

export const Description: FC<Props> = memo(({ children, validation }) => {
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.jobDetailsStep.advancedSection.modelMemoryLimit.title',
    {
      defaultMessage: 'Model memory limit',
    }
  );
  return (
    <EuiDescribedFormGroup
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.jobDetailsStep.advancedSection.modelMemoryLimit.description"
          defaultMessage="An approximate upper limit for the amount of memory that can be used by the analytical models."
        />
      }
    >
      <EuiFormRow error={validation.message} isInvalid={validation.valid === false}>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
