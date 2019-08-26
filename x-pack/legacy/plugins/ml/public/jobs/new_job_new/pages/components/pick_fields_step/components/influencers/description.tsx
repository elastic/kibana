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
  const title = i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.influencers.title', {
    defaultMessage: 'Influencers',
  });
  return (
    <EuiDescribedFormGroup
      idAria="single-example-aria"
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.pickFieldsStep.influencers.description"
          defaultMessage="Select which categorical fields have influence on the results. Who/what might you 'blame' for an anomaly? Recommend 1-3 influencers."
        />
      }
    >
      <EuiFormRow label={title} describedByIds={['single-example-aria']}>
        {children}
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
