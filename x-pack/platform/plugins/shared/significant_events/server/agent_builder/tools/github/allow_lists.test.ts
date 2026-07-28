/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAllowedBuiltinAgent,
  isAllowedBuiltinSkill,
  isAllowedBuiltinTool,
} from '@kbn/agent-builder-server/allow_lists';
import {
  GITHUB_CODE_RESEARCHER_AGENT_ID,
  GITHUB_MCP_TOOL_NAMES,
  GITHUB_RESEARCH_SKILL_IDS,
} from './constants';

describe('GitHub built-in allowlists', () => {
  it('allows every GitHub MCP proxy tool', () => {
    for (const toolName of GITHUB_MCP_TOOL_NAMES) {
      expect(isAllowedBuiltinTool(`github.${toolName}`)).toBe(true);
    }
    expect(isAllowedBuiltinTool('github.list_repos')).toBe(true);
  });

  it('allows the GitHub researcher agent and skills', () => {
    expect(isAllowedBuiltinAgent(GITHUB_CODE_RESEARCHER_AGENT_ID)).toBe(true);
    for (const skillId of GITHUB_RESEARCH_SKILL_IDS) {
      expect(isAllowedBuiltinSkill(skillId)).toBe(true);
    }
  });
});
