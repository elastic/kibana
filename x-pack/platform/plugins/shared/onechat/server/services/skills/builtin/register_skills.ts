/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillRegistry } from './builtin_skill_registry';

/**
 * Register built-in skills.
 * This function can be extended to register default/platform skills.
 */
export const registerBuiltinSkills = ({ registry }: { registry: BuiltinSkillRegistry }) => {
  // No built-in skills registered yet
  // Add platform skills here as needed
};

