/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlFeatures } from '../../common/constants/app';
import type { MlClientFactoryDeps } from './ml_client_factory';
import { registerMlAgentBuilder } from './register_ml_agent_builder';

const createAgentBuilderMock = () => ({
  tools: { register: jest.fn() },
  skills: { register: jest.fn() },
  agents: { register: jest.fn() },
  attachments: { registerType: jest.fn() },
  hooks: { onBeforeToolCall: jest.fn(), onAfterToolCall: jest.fn() },
  plugins: { register: jest.fn() },
  topSnippets: { numSnippets: 5, numWords: 100 },
});

const resolveMlCapabilities = jest.fn().mockResolvedValue(null);

const mlClientFactoryDeps: MlClientFactoryDeps = {
  getInternalSavedObjectsClient: jest.fn().mockReturnValue(null),
  getAuditService: jest.fn().mockReturnValue(null),
  spacesEnabled: false,
  authorization: undefined,
  mlLicense: { isSecurityEnabled: () => false } as MlClientFactoryDeps['mlLicense'],
  serverless: { isServerless: false, cpsEnabled: false },
  isMlReady: () => Promise.resolve(),
};

const features = (overrides: Partial<MlFeatures>): MlFeatures => ({
  ad: false,
  dfa: false,
  nlp: false,
  ...overrides,
});

describe('registerMlAgentBuilder', () => {
  it('does not register the data frame analytics skill when dfa is false', () => {
    const agentBuilder = createAgentBuilderMock();

    registerMlAgentBuilder({
      agentBuilder: agentBuilder as any,
      enabledFeatures: features({ ad: true, dfa: false }),
      resolveMlCapabilities,
      mlClientFactoryDeps,
    });

    const ids = agentBuilder.skills.register.mock.calls.map((call) => call[0].id);
    expect(ids).toEqual(['ml.anomaly-detection']);
    const attachmentIds = agentBuilder.attachments.registerType.mock.calls.map(
      (call) => call[0].id
    );
    expect(attachmentIds).not.toContain('ml.dfa_total_feature_importance');
    expect(attachmentIds).not.toContain('ml.dfa_scatterplot_matrix');
  });

  it('does not register anomaly detection when ad is false', () => {
    const agentBuilder = createAgentBuilderMock();

    registerMlAgentBuilder({
      agentBuilder: agentBuilder as any,
      enabledFeatures: features({ ad: false, dfa: true }),
      resolveMlCapabilities,
      mlClientFactoryDeps,
    });

    const ids = agentBuilder.skills.register.mock.calls.map((call) => call[0].id);
    expect(ids).toEqual(['ml.data-frame-analytics']);
    const attachmentIds = agentBuilder.attachments.registerType.mock.calls.map(
      (call) => call[0].id
    );
    expect(attachmentIds).toContain('ml.dfa_total_feature_importance');
    expect(attachmentIds).toContain('ml.dfa_scatterplot_matrix');
    expect(attachmentIds).not.toContain('ml.dfa_confusion_matrix');
  });

  it('registers neither skill when agent builder is absent', () => {
    const agentBuilder = createAgentBuilderMock();

    registerMlAgentBuilder({
      agentBuilder: undefined,
      enabledFeatures: features({ ad: true, dfa: true }),
      resolveMlCapabilities,
      mlClientFactoryDeps,
    });

    expect(agentBuilder.skills.register).not.toHaveBeenCalled();
  });
});
