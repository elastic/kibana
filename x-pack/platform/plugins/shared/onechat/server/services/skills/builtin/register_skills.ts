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
  // OneChat-owned built-in skills live here. Solution/platform skills MUST register themselves
  // from their owning plugins via `plugins.onechat.skills.register(...)`.
  // (intentionally empty)
};

