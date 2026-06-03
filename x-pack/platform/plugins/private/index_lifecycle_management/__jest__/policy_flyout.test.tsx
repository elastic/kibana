/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { docLinksServiceMock } from '@kbn/core/public/mocks';

import type { PolicyFromES } from '../common/types';
import { KibanaContextProvider } from '../public/shared_imports';
import { PolicyListContextProvider } from '../public/application/sections/policy_list/policy_list_context';
import { ViewPolicyFlyout } from '../public/application/sections/policy_list/policy_flyout';
import * as readOnlyHook from '../public/application/lib/use_is_read_only';
import { policyAllPhases } from './mocks';

const TestComponent = ({ policy }: { policy: PolicyFromES }) => {
  return (
    <KibanaContextProvider
      services={{ getUrlForApp: () => '', docLinks: docLinksServiceMock.createStartContract() }}
    >
      <PolicyListContextProvider>
        <ViewPolicyFlyout policy={policy} />
      </PolicyListContextProvider>
    </KibanaContextProvider>
  );
};

describe('View policy flyout', () => {
  beforeEach(() => {
    jest.spyOn(readOnlyHook, 'useIsReadOnly').mockReturnValue(false);
  });

  it('shows all phases', () => {
    const { container } = renderWithI18n(<TestComponent policy={policyAllPhases} />);
    expect(container).toMatchSnapshot();
  });

  it('renders manage button', () => {
    renderWithI18n(<TestComponent policy={policyAllPhases} />);
    const button = screen.getByTestId('managePolicyButton');
    expect(button).toBeInTheDocument();
  });

  it(`doesn't render manage button in read only view`, () => {
    jest.spyOn(readOnlyHook, 'useIsReadOnly').mockReturnValue(true);
    renderWithI18n(<TestComponent policy={policyAllPhases} />);
    const button = screen.queryByTestId('managePolicyButton');
    expect(button).not.toBeInTheDocument();
  });
});
