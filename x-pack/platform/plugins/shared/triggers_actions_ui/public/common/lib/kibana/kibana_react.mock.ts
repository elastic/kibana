/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { dashboardPluginMock } from '@kbn/dashboard-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { coreMock, scopedHistoryMock, themeServiceMock } from '@kbn/core/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';
import { TriggersAndActionsUiServices } from '../../../application/rules_app';
import { RuleTypeRegistryContract, ActionTypeRegistryContract } from '../../../types';
import { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';

export const createStartServicesMock = (): TriggersAndActionsUiServices => {
  const core = coreMock.createStart();
  const licensingPluginMock = licensingMock.createStart();
  return {
    ...core,
    actions: { validateEmailAddresses: jest.fn() },
    ruleTypeRegistry: {
      has: jest.fn(),
      register: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
    } as RuleTypeRegistryContract,
    dataPlugin: jest.fn(),
    navigateToApp: jest.fn(),
    alerting: {
      getNavigation: jest.fn(async (id) =>
        id === 'alert-with-nav' ? { path: '/alert' } : undefined
      ),
      getMaxAlertsPerRun: jest.fn(),
    },
    history: scopedHistoryMock.create(),
    setBreadcrumbs: jest.fn(),
    dashboard: dashboardPluginMock.createStartContract(),
    data: dataPluginMock.createStartContract(),
    dataViews: dataViewPluginMocks.createStartContract(),
    dataViewEditor: {
      openEditor: jest.fn(),
    } as unknown as DataViewEditorStart,
    unifiedSearch: unifiedSearchPluginMock.createStartContract(),
    actionTypeRegistry: {
      has: jest.fn(),
      register: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
    } as ActionTypeRegistryContract,
    charts: chartPluginMock.createStartContract(),
    isCloud: false,
    kibanaFeatures: [],
    element: {
      style: { cursor: 'pointer' },
    } as unknown as HTMLElement,
    theme$: themeServiceMock.createTheme$(),
    licensing: licensingPluginMock,
    expressions: expressionsPluginMock.createStartContract(),
    isServerless: false,
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    lens: lensPluginMock.createStartContract(),
  } as TriggersAndActionsUiServices;
};

export const createWithKibanaMock = () => {
  const services = createStartServicesMock();

  return (Component: unknown) => (props: unknown) => {
    return React.createElement(Component as string, { ...(props as object), kibana: { services } });
  };
};

export const createKibanaContextProviderMock = () => {
  const services = createStartServicesMock();

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(KibanaContextProvider, { services }, children);
};
