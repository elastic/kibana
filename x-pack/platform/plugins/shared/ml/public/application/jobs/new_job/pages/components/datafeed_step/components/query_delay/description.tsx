/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';
import type { Validation } from '../../../../../common/job_validator';

interface Props {
  validation: Validation;
}

export const Description: FC<PropsWithChildren<Props>> = memo(({ children, validation }) => {
  const title = i18n.translate('xpack.ml.newJob.wizard.datafeedStep.queryDelay.title', {
    defaultMessage: 'Query delay',
  });
  return (
    <EuiDescribedFormGroup
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.datafeedStep.queryDelay.description"
          defaultMessage="Time delay in seconds, between current time and latest input data time."
        />
      }
    >
      <EuiFormRow error={validation.message} isInvalid={validation.valid === false}>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
