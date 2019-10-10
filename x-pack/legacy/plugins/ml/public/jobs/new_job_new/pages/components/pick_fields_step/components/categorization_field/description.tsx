/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';

export const Description: FC = memo(({ children }) => {
  const title = i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.categorizationField.title', {
    defaultMessage: 'Categorization field',
  });
  return (
    <EuiDescribedFormGroup
      idAria="description"
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.categorizationField.description"
          defaultMessage="Optional, for use if analyzing unstructured log data. Using text data types is recommended."
        />
      }
    >
      <EuiFormRow label={title} describedByIds={['description']}>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
