/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';

interface Props {
  children: JSX.Element;
}

export const Description: FC<Props> = memo(({ children }) => {
  const title = i18n.translate('xpack.ml.newJob.wizard.jobDetailsStep.jobDescription.title', {
    defaultMessage: 'Job description',
  });
  return (
    <EuiDescribedFormGroup
      idAria="single-example-aria"
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.jobDetailsStep.jobDescription.description"
          defaultMessage="Optional descriptive text"
        />
      }
    >
      <EuiFormRow label={title} describedByIds={['single-example-aria']}>
        {children}
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
