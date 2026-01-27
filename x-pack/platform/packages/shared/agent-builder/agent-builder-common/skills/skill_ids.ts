/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasNamespaceName, isInProtectedNamespace } from '../base/namespaces';

// - Must start and end with letter or digit
// - Can contain letters, digits, hyphens, underscores and dots
export const skillIdRegexp =
  /^(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?))*$/;

export const skillIdMaxLength = 64;

export const validateSkillId = ({
  skillId,
  builtIn,
}: {
  skillId: string;
  builtIn: boolean;
}): string | undefined => {
  if (!skillIdRegexp.test(skillId)) {
    return `Skill ids must start and end with a letter or number, and can only contain lowercase letters, numbers, dots, hyphens and underscores`;
  }
  if (skillId.length > skillIdMaxLength) {
    return `Skill ids are limited to ${skillIdMaxLength} characters.`;
  }
  if (hasNamespaceName(skillId)) {
    return `Skill id cannot have the same name as a reserved namespace.`;
  }
  if (!builtIn) {
    if (isInProtectedNamespace(skillId)) {
      return `Skill id is using a protected namespace.`;
    }
  }
};

