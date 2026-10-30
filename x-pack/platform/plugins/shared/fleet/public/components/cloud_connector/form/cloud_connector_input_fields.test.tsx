/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { PackageInfo } from '../../../../common';
import type { CloudConnectorField } from '../types';

import { CloudConnectorInputFields } from './cloud_connector_input_fields';

jest.mock('../../..', () => ({ LazyPackagePolicyInputVarField: () => null }));

const TEST_SUBJ = 'roleArnField';
const FORMAT_ERROR = 'Enter a valid value';

const textField = (overrides: Partial<CloudConnectorField> = {}): CloudConnectorField => ({
  id: 'role_arn',
  label: 'Role ARN',
  type: 'text',
  dataTestSubj: TEST_SUBJ,
  value: '',
  ...overrides,
});

const renderFields = (fields: CloudConnectorField[], hasInvalidRequiredVars = false) =>
  render(
    <I18nProvider>
      <CloudConnectorInputFields
        fields={fields}
        onChange={jest.fn()}
        packageInfo={{} as PackageInfo}
        hasInvalidRequiredVars={hasInvalidRequiredVars}
      />
    </I18nProvider>
  );

describe('CloudConnectorInputFields', () => {
  it('shows the format error from validate as soon as the value is malformed', () => {
    renderFields([textField({ value: 'bad', validate: () => FORMAT_ERROR })]);

    expect(screen.getByText(FORMAT_ERROR)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ)).toBeInvalid();
  });

  it('shows no error when validate accepts the value', () => {
    renderFields([textField({ value: 'good', validate: () => undefined })]);

    expect(screen.queryByText(FORMAT_ERROR)).not.toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ)).not.toBeInvalid();
  });

  it('shows the required error for an empty value once required vars are flagged', () => {
    renderFields([textField({ validate: () => undefined })], true);

    expect(screen.getByText('Role ARN is required')).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ)).toBeInvalid();
  });
});
