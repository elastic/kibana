/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useHasAllAlertingV2Privileges } from '../hooks/use_has_alerting_v2_privilege';
import { RequireAlertingV2Privilege } from './require_alerting_v2_privilege';
import type { RequireAlertingV2PrivilegeProps } from './require_alerting_v2_privilege';

jest.mock('../hooks/use_has_alerting_v2_privilege');

const mockUseHasAllAlertingV2Privileges = useHasAllAlertingV2Privileges as jest.MockedFunction<
  typeof useHasAllAlertingV2Privileges
>;

const renderGate = (features: RequireAlertingV2PrivilegeProps['features'] = ['rules']) =>
  render(
    <I18nProvider>
      <RequireAlertingV2Privilege features={features} pageName="Rules">
        <div data-test-subj="gatedContent">Gated content</div>
      </RequireAlertingV2Privilege>
    </I18nProvider>
  );

describe('RequireAlertingV2Privilege', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when the user has the required privilege', () => {
    mockUseHasAllAlertingV2Privileges.mockReturnValue(true);
    renderGate();

    expect(screen.getByTestId('gatedContent')).toBeInTheDocument();
    expect(screen.queryByTestId('alertingV2RequiredPrivilegesPrompt')).not.toBeInTheDocument();
  });

  it('renders the interstitial listing the required privileges when access is denied', () => {
    mockUseHasAllAlertingV2Privileges.mockReturnValue(false);
    renderGate(['rules']);

    expect(screen.queryByTestId('gatedContent')).not.toBeInTheDocument();
    expect(screen.getByTestId('alertingV2RequiredPrivilegesPrompt')).toBeInTheDocument();
    expect(screen.getByText('Privileges required')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2RequiredPrivilege-alerting_v2_rules')).toBeInTheDocument();
    expect(screen.getByText('alerting_v2_rules.read')).toBeInTheDocument();
  });

  it('passes a single-feature set to the privileges hook', () => {
    mockUseHasAllAlertingV2Privileges.mockReturnValue(true);
    renderGate(['alerts']);

    expect(mockUseHasAllAlertingV2Privileges).toHaveBeenCalledWith(['alerts']);
  });

  it('passes a multi-feature set through unchanged (AND semantics)', () => {
    mockUseHasAllAlertingV2Privileges.mockReturnValue(true);
    renderGate(['alerts', 'rules']);

    expect(mockUseHasAllAlertingV2Privileges).toHaveBeenCalledWith(['alerts', 'rules']);
  });
});
