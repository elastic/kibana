/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface UserPersona {
  name: string;
  description: string;
  traits: string[];
  vocabulary: 'simple' | 'technical' | 'mixed';
}

export const NOVICE_PERSONA: UserPersona = {
  name: 'novice',
  description:
    'A beginner user unfamiliar with technical concepts. Asks basic questions, may use incorrect terminology, and needs step-by-step guidance.',
  traits: [
    'uses informal language',
    'asks for clarification often',
    'may misunderstand technical terms',
    'prefers simple explanations',
    'makes common beginner mistakes',
  ],
  vocabulary: 'simple',
};

export const EXPERT_PERSONA: UserPersona = {
  name: 'expert',
  description:
    'An experienced power user with deep domain knowledge. Uses precise terminology, asks advanced questions, and expects detailed responses.',
  traits: [
    'uses precise technical terminology',
    'asks about edge cases and internals',
    'expects concise and accurate answers',
    'references documentation and specs',
    'chains complex multi-step requests',
  ],
  vocabulary: 'technical',
};

export const ADVERSARIAL_PERSONA: UserPersona = {
  name: 'adversarial',
  description:
    'A user who tries to break the system, probe for vulnerabilities, or elicit unintended behavior. Sends malformed input, injection attempts, and confusing requests.',
  traits: [
    'sends malformed or unexpected inputs',
    'tries prompt injection and jailbreak patterns',
    'requests actions outside the intended scope',
    'sends contradictory instructions',
    'tests boundary conditions aggressively',
  ],
  vocabulary: 'mixed',
};

export const BUILT_IN_PERSONAS: Record<string, UserPersona> = {
  novice: NOVICE_PERSONA,
  expert: EXPERT_PERSONA,
  adversarial: ADVERSARIAL_PERSONA,
};

/**
 * Retrieve a persona by name (case-insensitive).
 * Falls back to the novice persona for unknown names.
 */
export const getPersona = (name: string): UserPersona => {
  return BUILT_IN_PERSONAS[name.toLowerCase()] ?? NOVICE_PERSONA;
};
