/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { context, propagation } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  getPrivacySettingsFromContext,
  getSpaceIdFromContext,
  SPACE_ID_BAGGAGE_KEY,
  withAgentBuilderContext,
} from './agent_builder_context';
import type { TracingPrivacySettings } from './privacy_settings';

const settings: TracingPrivacySettings = {
  enabled: true,
  includeUserPrompts: true,
  includeLlmResponses: false,
  includeToolDetails: false,
  includeSystemPrompt: false,
  includeRealNames: false,
  includeRealIds: false,
  includeUserData: false,
};

describe('withAgentBuilderContext', () => {
  let contextManager: AsyncLocalStorageContextManager;

  beforeEach(() => {
    contextManager = new AsyncLocalStorageContextManager();
    context.setGlobalContextManager(contextManager);
    contextManager.enable();
  });

  afterEach(() => {
    contextManager.disable();
  });

  it('overwrites inherited space baggage with default when spaceId is omitted', () => {
    const stale = propagation.createBaggage({
      [SPACE_ID_BAGGAGE_KEY]: { value: 'marketing' },
    });

    context.with(propagation.setBaggage(context.active(), stale), () => {
      withAgentBuilderContext(() => {
        expect(getSpaceIdFromContext(context.active())).toBe('default');
      });
    });
  });

  it('exposes privacy settings on the in-process context', () => {
    withAgentBuilderContext(
      () => {
        expect(getPrivacySettingsFromContext(context.active())).toEqual(settings);
      },
      { privacySettings: settings }
    );
  });
});
