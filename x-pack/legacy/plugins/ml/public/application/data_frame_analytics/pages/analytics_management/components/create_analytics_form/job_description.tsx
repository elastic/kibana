/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFormRow, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const helpText = i18n.translate('xpack.ml.dataframe.analytics.create.jobDescription.helpText', {
  defaultMessage: 'Optional descriptive text',
});

interface Props {
  description: string;
  setFormState: React.Dispatch<React.SetStateAction<any>>;
}

export const JobDescriptionInput: FC<Props> = ({ description, setFormState }) => (
  <EuiFormRow
    label={i18n.translate('xpack.ml.dataframe.analytics.create.jobDescription.label', {
      defaultMessage: 'Job description',
    })}
    helpText={helpText}
  >
    <EuiTextArea
      value={description}
      rows={2}
      onChange={e => {
        const value = e.target.value;
        setFormState({ description: value });
      }}
      data-test-subj="mlDFAnalyticsJobCreationJobDescription"
    />
  </EuiFormRow>
);
