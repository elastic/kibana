/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useHasAllAlertingPrivileges } from '../hooks/use_has_alerting_privilege';
import { RequireAlertingPrivilege } from './require_alerting_privilege';
import type { RequireAlertingPrivilegeProps } from './require_alerting_privilege';

jest.mock('../hooks/use_has_alerting_privilege');

const mockUseHasAllAlertingPrivileges = useHasAllAlertingPrivileges as jest.MockedFunction<
  typeof useHasAllAlertingPrivileges
>;

const renderGate = (features: RequireAlertingPrivilegeProps['features'] = ['rules']) =>
  render(
    <I18nProvider>
      <RequireAlertingPrivilege features={features} pageName="Rules">
        <div data-test-subj="gatedContent">Gated content</div>
      </RequireAlertingPrivilege>
    </I18nProvider>
  );

describe('RequireAlertingPrivilege', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when the user has the required privilege', () => {
    mockUseHasAllAlertingPrivileges.mockReturnValue(true);
    renderGate();

    expect(screen.getByTestId('gatedContent')).toBeInTheDocument();
    expect(screen.queryByTestId('alertingRequiredPrivilegesPrompt')).not.toBeInTheDocument();
  });

  it('renders the interstitial listing the required privileges when access is denied', () => {
    mockUseHasAllAlertingPrivileges.mockReturnValue(false);
    renderGate(['rules']);

    expect(screen.queryByTestId('gatedContent')).not.toBeInTheDocument();
    expect(screen.getByTestId('alertingRequiredPrivilegesPrompt')).toBeInTheDocument();
    expect(screen.getByText('Privileges required')).toBeInTheDocument();
    expect(screen.getByTestId('alertingRequiredPrivilege-alerting_v2_rules')).toBeInTheDocument();
  });

  it('passes a single-feature set to the privileges hook', () => {
    mockUseHasAllAlertingPrivileges.mockReturnValue(true);
    renderGate(['alerts']);

    expect(mockUseHasAllAlertingPrivileges).toHaveBeenCalledWith(['alerts']);
  });

  it('passes a multi-feature set through unchanged (AND semantics)', () => {
    mockUseHasAllAlertingPrivileges.mockReturnValue(true);
    renderGate(['alerts', 'rules']);

    expect(mockUseHasAllAlertingPrivileges).toHaveBeenCalledWith(['alerts', 'rules']);
  });
});
