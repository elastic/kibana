/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiFieldText, EuiFormRow, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import type { PackageInfo } from '../../../../common';
import { LazyPackagePolicyInputVarField } from '../../..';
import { findVariableDef, fieldIsInvalid } from '../utils';
import type { CloudConnectorField } from '../types';

export const CloudConnectorInputFields = ({
  fields,
  onChange,
  packageInfo,
  hasInvalidRequiredVars = false,
}: {
  fields: Array<CloudConnectorField>;
  onChange: (key: string, value: string) => void;
  packageInfo: PackageInfo;
  hasInvalidRequiredVars?: boolean;
}) => {
  // Helper styles for password fields
  const passwordFieldStyles = css`
    width: 100%;
    .euiFormControlLayout,
    .euiFormControlLayout__childrenWrapper,
    .euiFormRow,
    input {
      max-width: 100%;
      width: 100%;
    }
  `;

  // Helper to get error message
  const getInvalidError = (label: string) =>
    i18n.translate('xpack.fleet.cloudConnector.inputFields.fieldRequired', {
      defaultMessage: '{field} is required',
      values: { field: label },
    });

  return (
    <div>
      {fields.map((field) => {
        const invalid = fieldIsInvalid(field.value, hasInvalidRequiredVars);
        const invalidError = getInvalidError(field.label);

        if ((field.type === 'password' || field.type === 'text') && field.isSecret === true) {
          return (
            <React.Fragment key={field.id}>
              <EuiSpacer size="m" />
              <div css={passwordFieldStyles}>
                <Suspense fallback={<EuiLoadingSpinner size="l" />}>
                  <LazyPackagePolicyInputVarField
                    varDef={{
                      ...findVariableDef(packageInfo, field.id)!,
                      required: true,
                      type: field.type,
                    }}
                    value={field.value || ''}
                    onChange={(value) => onChange(field.id, value)}
                    errors={invalid ? [invalidError] : []}
                    forceShowErrors={invalid}
                    isEditPage={true}
                  />
                </Suspense>
              </div>
              <EuiSpacer size="m" />
            </React.Fragment>
          );
        }

        if (field.type === 'text') {
          return (
            <EuiFormRow
              key={field.id}
              label={field.label}
              isInvalid={invalid}
              error={invalid ? invalidError : undefined}
              fullWidth
              hasChildLabel={true}
              id={field.id}
            >
              <EuiFieldText
                id={field.id}
                fullWidth
                value={field.value || ''}
                isInvalid={invalid}
                onChange={(event) => onChange(field.id, event.target.value)}
                data-test-subj={field.dataTestSubj}
              />
            </EuiFormRow>
          );
        }

        return null;
      })}
    </div>
  );
};
