/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconTip } from '@elastic/eui';
import { render } from '@testing-library/react';
import React from 'react';

import { I18nProvider } from '@kbn/i18n-react';

import { ReservedRoleBadge } from './reserved_role_badge';
import type { Role } from '../../../../common';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiIconTip: jest.fn(() => <div data-test-subj="iconTip-mock" />),
  };
});

const MockedEuiIconTip = EuiIconTip as unknown as jest.Mock;

const reservedRole: Role = {
  name: '',
  elasticsearch: {
    cluster: [],
    indices: [],
    run_as: [],
  },
  kibana: [
    {
      spaces: ['*'],
      base: ['all'],
      feature: {},
    },
    {
      spaces: ['default'],
      base: ['foo'],
      feature: {},
    },
    {
      spaces: ['marketing'],
      base: ['read'],
      feature: {},
    },
  ],
  metadata: {
    _reserved: true,
  },
};

const unreservedRole = {
  name: '',
  elasticsearch: {
    cluster: [],
    indices: [],
    run_as: [],
  },
  kibana: [
    {
      spaces: ['*'],
      base: ['all'],
      feature: {},
    },
    {
      spaces: ['default'],
      base: ['foo'],
      feature: {},
    },
    {
      spaces: ['marketing'],
      base: ['read'],
      feature: {},
    },
  ],
};

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

test('it renders without crashing', () => {
  MockedEuiIconTip.mockClear();
  renderWithIntl(<ReservedRoleBadge role={reservedRole} />);
  expect(MockedEuiIconTip).toHaveBeenCalledTimes(1);
});

test('it renders nothing for an unreserved role', () => {
  const { container } = renderWithIntl(<ReservedRoleBadge role={unreservedRole} />);
  expect(container).toBeEmptyDOMElement();
});
