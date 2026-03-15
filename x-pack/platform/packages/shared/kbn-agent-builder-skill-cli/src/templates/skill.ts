/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDomain } from '../constants';
import { DOMAIN_BASE_PATHS, ELASTIC_LICENSE_HEADER } from '../constants';
import { toCamelCase } from '../utils';

export function renderSkillFile(opts: {
  name: string;
  domain: SkillDomain;
  basePath: string;
  description: string;
}): string {
  const varName = `${toCamelCase(opts.name)}Skill`;
  const resolvedBasePath = opts.basePath || DOMAIN_BASE_PATHS[opts.domain];

  return `${ELASTIC_LICENSE_HEADER}

import { defineSkillType } from '@kbn/agent-builder-server/skills';

export const ${varName} = defineSkillType({
  id: '${opts.name}',
  name: '${opts.name}',
  basePath: '${resolvedBasePath}',
  description:
    '${opts.description}',
  content: \`# ${toTitleCase(opts.name)}

## Overview

TODO: Describe what this skill does and when the agent should use it.

## Instructions

TODO: Provide step-by-step instructions for the agent.

## Examples

TODO: Add example interactions.
\`,
  getRegistryTools: () => [
    // TODO: Add tool IDs from the registry that this skill needs
    // e.g. 'platform.core.search', 'security.alerts'
  ],
});
`;
}

function toTitleCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
