/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/public/mocks';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { fieldsMetadataPluginPublicMock } from '@kbn/fields-metadata-plugin/public/mocks';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { kqlPluginMock } from '@kbn/kql/public/mocks';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import { Plugin } from './plugin';

const createPluginsStart = () => {
  const coreStart = coreMock.createStart();
  return {
    security: securityMock.createStart(),
    data: dataPluginMock.createStartContract(),
    dataViews: dataViewPluginMocks.createStartContract(),
    dataViewEditor: {
      openEditor: jest.fn(),
    } as unknown as DataViewEditorStart,
    charts: chartPluginMock.createStartContract(),
    navigateToApp: coreStart.application.navigateToApp,
    features: featuresPluginMock.createStart(),
    expressions: expressionsPluginMock.createStartContract(),
    unifiedSearch: unifiedSearchPluginMock.createStartContract(),
    kql: kqlPluginMock.createStartContract(),
    licensing: licensingMock.createStart(),
    fieldFormats: fieldFormatsServiceMock.createStartContract() as FieldFormatsRegistry,
    lens: lensPluginMock.createStartContract(),
    fieldsMetadata: fieldsMetadataPluginPublicMock.createStartContract(),
    uiActions: uiActionsPluginMock.createStartContract(),
    share: sharePluginMock.createStartContract(),
  };
};

describe('Plugin Stack Alerts management registration', () => {
  it('registers the Alerts page for project side nav only so it stays out of global search', () => {
    const management = managementPluginMock.createSetupContract();
    const plugin = new Plugin(
      coreMock.createPluginInitializerContext({
        enableExperimental: [],
        rules: { enabled: false },
      })
    );

    plugin.setup(coreMock.createSetup(), {
      security: securityMock.createSetup(),
      management,
      actions: {
        validateEmailAddresses: jest.fn(),
        enabledEmailServices: ['*'],
        isWebhookSslWithPfxEnabled: jest.fn(),
      } as unknown as ActionsPublicPluginSetup,
      share: sharePluginMock.createSetupContract(),
    });

    expect(management.sections.section.insightsAndAlerting.registerApp).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'triggersActionsAlerts',
        visibleIn: ['projectSideNav'],
      })
    );
  });
});

describe('Plugin connector type builder management registration', () => {
  const setupPlugin = () => {
    const management = managementPluginMock.createSetupContract();
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);
    const plugin = new Plugin(
      coreMock.createPluginInitializerContext({
        enableExperimental: [],
        rules: { enabled: false },
      })
    );
    plugin.setup(coreSetup, {
      security: securityMock.createSetup(),
      management,
      actions: {
        validateEmailAddresses: jest.fn(),
        enabledEmailServices: ['*'],
        isWebhookSslWithPfxEnabled: jest.fn(),
      } as unknown as ActionsPublicPluginSetup,
      share: sharePluginMock.createSetupContract(),
    });
    const registrations = (
      management.sections.section.insightsAndAlerting.registerApp as jest.Mock
    ).mock.calls.map(([args]) => args);
    return { coreStart, registrations };
  };

  it('registers its own app right after Connectors', () => {
    const { registrations } = setupPlugin();
    const ids = registrations.map(({ id }) => id);
    const connectors = registrations.find(({ id }) => id === 'triggersActionsConnectors');
    const builder = registrations.find(({ id }) => id === 'triggersActionsConnectorTypeBuilder');

    expect(builder).toEqual(expect.objectContaining({ title: 'Connector type builder' }));
    expect(builder.order).toBe(connectors.order);
    expect(ids.indexOf('triggersActionsConnectorTypeBuilder')).toBeGreaterThan(
      ids.indexOf('triggersActionsConnectors')
    );
  });

  it('forwards to the /connectors/build route of the Connectors app when mounted', async () => {
    const { coreStart, registrations } = setupPlugin();
    const builder = registrations.find(({ id }) => id === 'triggersActionsConnectorTypeBuilder');

    const unmount = await builder.mount({});

    expect(coreStart.application.navigateToApp).toHaveBeenCalledWith('management', {
      path: '/insightsAndAlerting/triggersActionsConnectors/connectors/build',
      replace: true,
    });
    expect(typeof unmount).toBe('function');
  });
});

describe('Plugin getClassicRulesPage', () => {
  it('returns a React element for the given page props', () => {
    const plugin = new Plugin(
      coreMock.createPluginInitializerContext({
        enableExperimental: [],
        rules: { enabled: false },
      })
    );

    plugin.setup(coreMock.createSetup(), {
      security: securityMock.createSetup(),
      management: managementPluginMock.createSetupContract(),
      actions: {
        validateEmailAddresses: jest.fn(),
        enabledEmailServices: ['*'],
        isWebhookSslWithPfxEnabled: jest.fn(),
      } as unknown as ActionsPublicPluginSetup,
      share: sharePluginMock.createSetupContract(),
    });

    const start = plugin.start(coreMock.createStart(), createPluginsStart());
    const element = start.getClassicRulesPage({
      coreStart: coreMock.createStart(),
      setBreadcrumbs: jest.fn(),
    });

    expect(React.isValidElement(element)).toBe(true);
  });
});
