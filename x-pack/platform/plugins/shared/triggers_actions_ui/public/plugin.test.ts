/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    licensing: licensingMock.createStart(),
    fieldFormats: fieldFormatsServiceMock.createStartContract() as FieldFormatsRegistry,
    lens: lensPluginMock.createStartContract(),
    fieldsMetadata: fieldsMetadataPluginPublicMock.createStartContract(),
    uiActions: uiActionsPluginMock.createStartContract(),
    share: sharePluginMock.createStartContract(),
  };
};

describe('Plugin getClassicRulesPage', () => {
  it('returns a stable component identity across calls', () => {
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

    expect(start.getClassicRulesPage()).toBe(start.getClassicRulesPage());
  });
});
