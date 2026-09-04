/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { Plugin } from './plugin';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';

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

    const start = plugin.start(coreMock.createStart(), {
      security: securityMock.createStart(),
      uiActions: uiActionsPluginMock.createStartContract(),
    } as Parameters<Plugin['start']>[1]);

    expect(start.getClassicRulesPage()).toBe(start.getClassicRulesPage());
  });
});
