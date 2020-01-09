/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFieldText, EuiForm, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Policy } from '../../common/types/domain_data';

interface ValidationResults {
  [key: string]: React.ReactNode[];
}

export const policyFormValidation = (policy: Partial<Policy>): ValidationResults => {
  const errors: ValidationResults = {};

  if (!policy.name?.trim()) {
    errors.name = [
      <FormattedMessage
        id="xpack.fleet.policyForm.nameRequiredErrorMessage"
        defaultMessage="Policy name is required"
      />,
    ];
  }

  return errors;
};

interface Props {
  policy: Partial<Policy>;
  updatePolicy: (u: Partial<Policy>) => void;
  validation: ValidationResults;
}

export const PolicyForm: React.FC<Props> = ({ policy, updatePolicy, validation }) => {
  const [touchedFields, setTouchedFields] = useState<{ [key: string]: boolean }>({});

  return (
    <EuiForm>
      {[
        [
          'name',
          <FormattedMessage id="xpack.fleet.policyForm.nameFieldLabel" defaultMessage="Name" />,
        ],
        [
          'description',
          <FormattedMessage
            id="xpack.fleet.policyForm.descriptionFieldLabel"
            defaultMessage="Description"
          />,
        ],
        [
          'label',
          <FormattedMessage id="xpack.fleet.policyForm.labelFieldLabel" defaultMessage="Label" />,
        ],
      ].map(field => {
        const [fieldName, label] = field as ['name' | 'description' | 'label', JSX.Element];
        return (
          <EuiFormRow
            label={label}
            error={touchedFields[fieldName] && validation[fieldName] ? validation[fieldName] : null}
            isInvalid={Boolean(touchedFields[fieldName] && validation[fieldName])}
          >
            <EuiFieldText
              value={policy[fieldName]}
              onChange={e => updatePolicy({ [fieldName]: e.target.value })}
              isInvalid={Boolean(touchedFields[fieldName] && validation[fieldName])}
              onBlur={() => setTouchedFields({ ...touchedFields, [fieldName]: true })}
            />
          </EuiFormRow>
        );
      })}
    </EuiForm>
  );
};
