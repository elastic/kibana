/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GITHUB_RESEARCH_SKILL_IDS } from '../../tools/github/constants';
import { githubCodeResearcherAgent } from '.';

describe('GitHub Code Researcher agent', () => {
  it('routes through exactly the GitHub research skills', () => {
    expect(githubCodeResearcherAgent.id).toBe('github.code_researcher');
    expect(githubCodeResearcherAgent.configuration.tools).toEqual([]);
    expect(githubCodeResearcherAgent.configuration.skill_ids).toEqual([
      ...GITHUB_RESEARCH_SKILL_IDS,
    ]);
    expect(githubCodeResearcherAgent.configuration.enable_elastic_capabilities).toBe(false);
  });

  it('routes workflow requests to the KI discovery skill', () => {
    expect(githubCodeResearcherAgent.configuration.instructions).toContain(
      'load github-ki-discovery'
    );
  });
});
