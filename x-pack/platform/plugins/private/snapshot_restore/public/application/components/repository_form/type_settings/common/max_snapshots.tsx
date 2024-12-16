/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescribedFormGroup, EuiFieldText, EuiFormRow, EuiTitle, EuiCode } from '@elastic/eui';
import { RepositorySettingsValidation } from '../../../../services/validation';

interface Props {
  isInvalid: boolean;
  defaultValue: string;
  updateSettings: (name: string, value: string) => void;
  error: RepositorySettingsValidation['maxSnapshotBytesPerSec'];
}

export const MaxSnapshotsField: React.FunctionComponent<Props> = ({
  isInvalid,
  error,
  defaultValue,
  updateSettings,
}) => {
  return (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.repositoryForm.commonFields.maxSnapshotBytesTitle"
              defaultMessage="Max snapshot bytes per second"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.repositoryForm.commonFields.maxSnapshotBytesDescription"
          defaultMessage="Maximum rate for creating snapshots for each node."
        />
      }
      fullWidth
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.commonFields.maxSnapshotBytesLabel"
            defaultMessage="Max snapshot bytes per second"
          />
        }
        fullWidth
        isInvalid={isInvalid}
        error={error}
        helpText={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryForm.commonFields.maxSnapshotBytesHelpText"
            defaultMessage="Accepts byte size units, such as {example1}, {example2}, {example3}, or {example4}. Defaults to {defaultSize} per second."
            values={{
              example1: <EuiCode>1g</EuiCode>,
              example2: <EuiCode>10mb</EuiCode>,
              example3: <EuiCode>5k</EuiCode>,
              example4: <EuiCode>1024B</EuiCode>,
              defaultSize: <EuiCode>40mb</EuiCode>,
            }}
          />
        }
      >
        <EuiFieldText
          defaultValue={defaultValue}
          fullWidth
          onChange={(e) => updateSettings('maxSnapshotBytesPerSec', e.target.value)}
          data-test-subj="maxSnapshotBytesInput"
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
