/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const VALID_DOMAINS = ['security', 'observability', 'platform', 'search'] as const;
export type SkillDomain = (typeof VALID_DOMAINS)[number];

export const DOMAIN_BASE_PATHS: Record<SkillDomain, string> = {
  security: 'skills/security',
  observability: 'skills/observability',
  platform: 'skills/platform',
  search: 'skills/search',
};

export const DOMAIN_PLUGIN_PATHS: Record<SkillDomain, string> = {
  security: 'x-pack/solutions/security/plugins/security_solution/server/agent_builder',
  observability: 'x-pack/solutions/observability/plugins/observability_agent_builder/server',
  platform: 'x-pack/platform/plugins/shared/agent_builder_platform/server',
  search: 'x-pack/solutions/search/plugins/search_agent_builder/server',
};

export const SKILL_NAME_REGEX = /^[a-z0-9-_]+$/;
export const MAX_SKILL_NAME_LENGTH = 64;
export const MAX_DESCRIPTION_LENGTH = 1024;
export const MAX_INLINE_TOOLS = 7;

export const ELASTIC_LICENSE_HEADER = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */`;
