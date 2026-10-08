/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { AI_INSIGHTS_EMBEDDABLE_TYPE } from '../common/ai_insights/constants';
import { AgentBuilderDashboardsPlugin } from './plugin';

describe('AgentBuilderDashboardsPlugin', () => {
  it('registers attachment type, skill, SML type, embeddable schema, and AI insights route', () => {
    const registerAttachmentType = jest.fn();
    const registerSkill = jest.fn();
    const registerSmlType = jest.fn();
    const registerEmbeddableServerDefinition = jest.fn();
    const versionedPost = jest.fn(() => ({ addVersion: jest.fn() }));

    const coreSetup = {
      ...coreMock.createSetup(),
      http: {
        createRouter: () => ({
          versioned: {
            post: versionedPost,
          },
        }),
      },
    };

    const plugin = new AgentBuilderDashboardsPlugin(coreMock.createPluginInitializerContext());

    plugin.setup(coreSetup as never, {
      agentBuilder: {
        attachments: { registerType: registerAttachmentType },
        skills: { register: registerSkill },
      },
      agentBuilderSml: {
        registerType: registerSmlType,
      },
      embeddable: {
        registerEmbeddableServerDefinition,
      },
    } as never);

    expect(registerAttachmentType).toHaveBeenCalledTimes(1);
    expect(registerSkill).toHaveBeenCalledTimes(1);
    expect(registerSkill).toHaveBeenCalledWith(expect.objectContaining({ id: 'dashboards' }));
    expect(registerSmlType).toHaveBeenCalledTimes(1);
    expect(registerSmlType).toHaveBeenCalledWith(expect.objectContaining({ id: 'dashboard' }));
    expect(registerEmbeddableServerDefinition).toHaveBeenCalledWith(
      AI_INSIGHTS_EMBEDDABLE_TYPE,
      expect.objectContaining({
        getSchema: expect.any(Function),
      })
    );
    expect(versionedPost).toHaveBeenCalled();
  });
});
