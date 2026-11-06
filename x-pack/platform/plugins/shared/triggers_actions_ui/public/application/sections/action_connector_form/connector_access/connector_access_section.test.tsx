/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { AccessPolicyResponse } from '@kbn/ols-ui';
import type { AppMockRenderer } from '../../test_utils';
import { createAppMockRenderer } from '../../test_utils';
import { ConnectorAccessSection } from './connector_access_section';

const POLICY: AccessPolicyResponse = {
  enabled: true,
  general_access_levels: ['none', 'use', 'edit'],
  default_general_access_level: 'use',
  entry_levels: ['use'],
  operations: { view: { level: 'view' }, use: { level: 'use' }, edit: { level: 'edit' } },
};

describe('ConnectorAccessSection', () => {
  let appMockRenderer: AppMockRenderer;
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.http.post = jest.fn().mockResolvedValue({ users: [] });
  });

  it('shows access controls and named entries', () => {
    appMockRenderer.render(
      <ConnectorAccessSection
        policy={POLICY}
        value={{
          general_access: 'none',
          entries: [
            { type: 'user', id: 'u_alice', access: 'use' },
            { type: 'service_account', id: 'kibana/svc', access: 'use' },
          ],
        }}
        onChange={onChange}
      />
    );

    expect(screen.getByTestId('accessPanelGeneralAccess')).toHaveTextContent(
      'Only people with access'
    );
    expect(screen.getByText('Access scope')).toBeInTheDocument();
    expect(screen.getByTestId('accessPanelEntryLevel-u_alice')).toHaveTextContent('Can run');
  });

  it('reports general access changes', async () => {
    appMockRenderer.render(
      <ConnectorAccessSection
        policy={POLICY}
        value={{ general_access: 'use', entries: [] }}
        onChange={onChange}
      />
    );
    expect(screen.getByTestId('connectorAccessSection')).toHaveTextContent(
      'Everyone in this space can run'
    );

    await userEvent.click(screen.getByTestId('accessPanelGeneralAccess'));
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByTestId('accessPanelGeneralAccessOption-none'));

    expect(onChange).toHaveBeenCalledWith({ general_access: 'none', entries: [] });
  });

  it('adds a typed service account and suggests connector principals', async () => {
    appMockRenderer.render(
      <ConnectorAccessSection
        policy={POLICY}
        value={{ general_access: 'use', entries: [] }}
        onChange={onChange}
      />
    );

    await userEvent.type(screen.getByTestId('accessPanelServiceAccountInput'), 'kibana/svc{enter}');

    expect(onChange).toHaveBeenCalledWith({
      general_access: 'use',
      entries: [{ type: 'service_account', id: 'kibana/svc', access: 'use' }],
    });
    await waitFor(() =>
      expect(appMockRenderer.coreStart.http.post).toHaveBeenCalledWith(
        '/internal/security/ols/action/_suggest_principals',
        expect.anything()
      )
    );
  });

  it('disables the editor while saving', () => {
    appMockRenderer.render(
      <ConnectorAccessSection
        policy={POLICY}
        value={{ general_access: 'use', entries: [] }}
        onChange={onChange}
        isDisabled
      />
    );

    expect(
      within(screen.getByTestId('accessPanelPrincipalPicker')).getByRole('combobox')
    ).toBeDisabled();
  });
});
