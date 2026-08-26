/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core-capabilities-common';

import { canUserChangeSpaceChatExperience } from './can_change_space_chat_experience';

const base: Capabilities = { navLinks: {}, management: {}, catalogue: {} };

describe('canUserChangeSpaceChatExperience', () => {
  const fullPrivileges: Capabilities = {
    ...base,
    advancedSettings: { save: true },
    observabilityAIAssistant: { show: true },
    securitySolutionAssistant: { 'ai-assistant': false },
    agentBuilder: { manageAgents: true },
  };

  it('returns true when advancedSettings.save, an assistant, and manageAgents are all granted', () => {
    expect(canUserChangeSpaceChatExperience(fullPrivileges)).toBe(true);
    expect(
      canUserChangeSpaceChatExperience({
        ...base,
        advancedSettings: { save: true },
        observabilityAIAssistant: { show: false },
        securitySolutionAssistant: { 'ai-assistant': true },
        agentBuilder: { manageAgents: true },
      })
    ).toBe(true);
  });

  it('returns false without advancedSettings.save', () => {
    expect(
      canUserChangeSpaceChatExperience({
        ...fullPrivileges,
        advancedSettings: { save: false },
      })
    ).toBe(false);
    expect(canUserChangeSpaceChatExperience({ ...fullPrivileges, advancedSettings: {} })).toBe(
      false
    );
  });

  it('returns false without manageAgents', () => {
    expect(
      canUserChangeSpaceChatExperience({
        ...fullPrivileges,
        agentBuilder: { manageAgents: false },
      })
    ).toBe(false);
  });

  it('returns false when neither solution assistant is available', () => {
    expect(
      canUserChangeSpaceChatExperience({
        ...fullPrivileges,
        observabilityAIAssistant: { show: false },
        securitySolutionAssistant: { 'ai-assistant': false },
      })
    ).toBe(false);
  });

  it('returns false for empty capabilities', () => {
    expect(canUserChangeSpaceChatExperience(base)).toBe(false);
  });
});
