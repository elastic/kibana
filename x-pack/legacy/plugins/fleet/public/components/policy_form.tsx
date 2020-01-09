/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFieldText, EuiForm, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Policy } from '../../common/types/domain_data';

interface Props {
  policy: Partial<Policy>;
  updatePolicy: (u: Partial<Policy>) => void;
}

export const PolicyForm: React.FC<Props> = ({ policy, updatePolicy }) => {
  return (
    <EuiForm>
      {/* Name */}
      <EuiFormRow
        label={
          <FormattedMessage id="xpack.fleet.policyForm.nameFieldLabel" defaultMessage="Name" />
        }
      >
        <EuiFieldText value={policy.name} onChange={e => updatePolicy({ name: e.target.value })} />
      </EuiFormRow>

      {/* Description */}
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.fleet.policyForm.descriptionFieldLabel"
            defaultMessage="Description"
          />
        }
      >
        <EuiFieldText
          value={policy.description}
          onChange={e => updatePolicy({ description: e.target.value })}
        />
      </EuiFormRow>
    </EuiForm>
  );
};
