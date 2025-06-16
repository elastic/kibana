/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React from 'react';

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { scopedHistoryMock } from '@kbn/core-application-browser-mocks';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import type { GetTabsProps } from './edit_space_tabs';
import { getTabs } from './edit_space_tabs';

const space = {
  id: 'my-space',
  name: 'My Space',
  disabledFeatures: [],
};
const features = [
  new KibanaFeature({
    id: 'feature-1',
    name: 'feature 1',
    app: [],
    category: DEFAULT_APP_CATEGORIES.kibana,
    privileges: null,
  }),
];
const history = scopedHistoryMock.create();
const allowFeatureVisibility = true;
const allowSolutionVisibility = true;

const getCapabilities = (
  options: Partial<GetTabsProps['capabilities']> = { roles: { save: false, view: true } }
) => ({
  navLinks: {},
  management: {},
  catalogue: {},
  spaces: { manage: true },
  ...options,
});

describe('Edit Space Tabs: getTabs', () => {
  it('can include a Permissions tab', () => {
    const isRoleManagementEnabled = true;
    const isSecurityEnabled = true;
    const capabilities = getCapabilities();

    expect(
      getTabs({
        isRoleManagementEnabled,
        capabilities,
        space,
        features,
        history,
        allowFeatureVisibility,
        allowSolutionVisibility,
        isSecurityEnabled,
        enableSecurityLink: '',
      }).map(({ id, name }) => ({ name, id }))
    ).toEqual([
      { id: 'general', name: 'General settings' },
      { id: 'roles', name: 'Permissions' },
      { id: 'content', name: 'Content' },
    ]);
  });

  it('can include count of roles as a badge for Permissions tab', () => {
    const isRoleManagementEnabled = true;
    const isSecurityEnabled = true;
    const capabilities = getCapabilities();

    const rolesTab = getTabs({
      rolesCount: 42,
      isRoleManagementEnabled,
      capabilities,
      space,
      features,
      history,
      allowFeatureVisibility,
      allowSolutionVisibility,
      isSecurityEnabled,
      enableSecurityLink: '',
    }).find((tab) => tab.id === 'roles');

    if (!rolesTab?.append) {
      throw new Error('roles tab did not exist or did not have a badge!');
    }
    const { getByText } = render(rolesTab.append);

    expect(getByText('42')).toBeInTheDocument();
  });

  it('should show a warning callout when security is disabled', () => {
    const isRoleManagementEnabled = true;
    const isSecurityEnabled = false;
    const capabilities = getCapabilities();

    const rolesTab = getTabs({
      rolesCount: 0,
      isRoleManagementEnabled,
      capabilities,
      space,
      features,
      history,
      allowFeatureVisibility,
      allowSolutionVisibility,
      isSecurityEnabled,
      enableSecurityLink: '',
    }).find((tab) => tab.id === 'roles');

    if (!rolesTab?.content) {
      throw new Error('roles tab did not exist!');
    }
    const { getByTestId } = render(<IntlProvider locale="en">{rolesTab.content}</IntlProvider>);

    expect(getByTestId('securityDisabledCallout')).toBeInTheDocument();
  });

  it('hides Permissions tab when role management is not enabled', () => {
    expect(
      getTabs({
        space,
        isRoleManagementEnabled: false,
        capabilities: getCapabilities(),
        features,
        history,
        allowFeatureVisibility,
        allowSolutionVisibility,
        isSecurityEnabled: true,
        enableSecurityLink: '',
      }).map(({ id, name }) => ({ name, id }))
    ).toEqual([
      { id: 'general', name: 'General settings' },
      { id: 'content', name: 'Content' },
    ]);
  });

  it('hides Permissions tab when role capabilities do not include "view"', () => {
    expect(
      getTabs({
        space,
        isRoleManagementEnabled: true,
        capabilities: getCapabilities({ roles: { save: false, view: false } }),
        features,
        history,
        allowFeatureVisibility,
        allowSolutionVisibility,
        isSecurityEnabled: true,
        enableSecurityLink: '',
      }).map(({ id, name }) => ({ name, id }))
    ).toEqual([
      { id: 'general', name: 'General settings' },
      { id: 'content', name: 'Content' },
    ]);
  });
});
