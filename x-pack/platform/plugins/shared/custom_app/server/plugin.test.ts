/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAllowedBuiltinAttachment,
  isAllowedBuiltinSkill,
  isAllowedBuiltinTool,
} from '@kbn/agent-builder-server/allow_lists';
import { coreMock } from '@kbn/core/server/mocks';
import { CUSTOM_APP_EMBEDDABLE_TYPE } from '@kbn/custom-app-common';
import { CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE } from '../common/app_context_attachment';
import { CustomAppPlugin } from './plugin';
import { CUSTOM_APP_CREATION_SKILL_ID } from './skills/custom_app_creation_skill';
import {
  CREATE_CUSTOM_APP_TOOL_ID,
  UPDATE_CUSTOM_APP_TOOL_ID,
} from './tools/update_custom_app_tool';

const setup = (withAgentBuilder: boolean) => {
  const core = coreMock.createSetup();
  const features = { registerKibanaFeature: jest.fn() };
  const embeddable = { registerEmbeddableServerDefinition: jest.fn() };
  const agentBuilder = {
    attachments: { registerType: jest.fn() },
    tools: { register: jest.fn() },
    skills: { register: jest.fn() },
  };

  new CustomAppPlugin().setup(core, {
    embeddable,
    features,
    ...(withAgentBuilder ? { agentBuilder } : {}),
  } as never);

  return { core, features, embeddable, agentBuilder };
};

describe('CustomAppPlugin on the server', () => {
  it('registers the panel type, with or without Agent Builder', () => {
    [true, false].forEach((withAgentBuilder) => {
      const { embeddable } = setup(withAgentBuilder);

      expect(embeddable.registerEmbeddableServerDefinition).toHaveBeenCalledWith(
        CUSTOM_APP_EMBEDDABLE_TYPE,
        expect.objectContaining({ getSchema: expect.any(Function) })
      );
    });
  });

  describe('saved apps', () => {
    it('registers the type, the feature that governs it and the routes, with or without Agent Builder', () => {
      [true, false].forEach((withAgentBuilder) => {
        const { core, features } = setup(withAgentBuilder);

        expect(core.savedObjects.registerType).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'custom_app' })
        );
        expect(features.registerKibanaFeature).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'customApp' })
        );
        expect(core.http.createRouter).toHaveBeenCalled();
      });
    });
  });

  describe('with Agent Builder', () => {
    it('registers the attachment type, both tools and the skill', () => {
      const { agentBuilder } = setup(true);

      expect(agentBuilder.attachments.registerType).toHaveBeenCalledWith(
        expect.objectContaining({ id: CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE })
      );
      expect(agentBuilder.tools.register).toHaveBeenCalledWith(
        expect.objectContaining({ id: UPDATE_CUSTOM_APP_TOOL_ID })
      );
      expect(agentBuilder.tools.register).toHaveBeenCalledWith(
        expect.objectContaining({ id: CREATE_CUSTOM_APP_TOOL_ID })
      );
      expect(agentBuilder.skills.register).toHaveBeenCalledWith(
        expect.objectContaining({ id: CUSTOM_APP_CREATION_SKILL_ID })
      );
    });

    it('registers each exactly once', () => {
      const { agentBuilder } = setup(true);

      expect(agentBuilder.attachments.registerType).toHaveBeenCalledTimes(1);
      expect(agentBuilder.tools.register).toHaveBeenCalledTimes(2);
      expect(agentBuilder.skills.register).toHaveBeenCalledTimes(1);
    });
  });

  describe('without Agent Builder', () => {
    it('sets up without registering anything, and without failing', () => {
      expect(() => setup(false)).not.toThrow();
    });
  });

  describe('the allowlist', () => {
    // Agent Builder refuses to start if something it is given is not on its list, so a tool or
    // attachment added here without being added there would stop Kibana from starting.
    it('has the tools and the skill', () => {
      expect(isAllowedBuiltinTool(UPDATE_CUSTOM_APP_TOOL_ID)).toBe(true);
      expect(isAllowedBuiltinTool(CREATE_CUSTOM_APP_TOOL_ID)).toBe(true);
      expect(isAllowedBuiltinSkill(CUSTOM_APP_CREATION_SKILL_ID)).toBe(true);
    });

    it('has the attachment type', () => {
      expect(isAllowedBuiltinAttachment(CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE)).toBe(true);
    });

    it('does not have ids this plugin does not register, so the list does not collect strays', () => {
      expect(isAllowedBuiltinTool('custom_app_something_else')).toBe(false);
      expect(isAllowedBuiltinAttachment('platform.custom_app.something_else')).toBe(false);
    });
  });
});
