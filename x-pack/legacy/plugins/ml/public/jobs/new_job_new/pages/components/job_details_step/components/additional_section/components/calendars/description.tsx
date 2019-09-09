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
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.calendarsSelection.title',
    {
      defaultMessage: 'Calendars',
    }
  );
  return (
    <EuiDescribedFormGroup
      idAria="description"
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.calendarsSelection.description"
          defaultMessage="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam."
        />
      }
    >
      <EuiFormRow label={title} describedByIds={['description']}>
        {children}
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
