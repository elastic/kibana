/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, the Elastic License
 * 2.0.
 */

import {
  GITHUB_ISSUE_READ_TOOL_ID,
  GITHUB_PULL_REQUEST_READ_TOOL_ID,
  GITHUB_SEARCH_ISSUES_TOOL_ID,
  GITHUB_SEARCH_PULL_REQUESTS_TOOL_ID,
} from '../../tools/github/constants';
import { githubCodeSearchSkill, githubIssuePrResearchSkill, githubKiDiscoverySkill } from '.';

describe('GitHub research skills', () => {
  it('keeps issue and pull-request tools out of KI discovery', async () => {
    const tools = await githubKiDiscoverySkill.getRegistryTools?.();
    expect(tools).not.toContain(GITHUB_SEARCH_ISSUES_TOOL_ID);
    expect(tools).not.toContain(GITHUB_SEARCH_PULL_REQUESTS_TOOL_ID);
    expect(tools).not.toContain(GITHUB_ISSUE_READ_TOOL_ID);
    expect(tools).not.toContain(GITHUB_PULL_REQUEST_READ_TOOL_ID);
  });

  it('loads issue and pull-request search and detail tools for historical research', async () => {
    const tools = await githubIssuePrResearchSkill.getRegistryTools?.();
    expect(tools).toEqual(
      expect.arrayContaining([
        GITHUB_SEARCH_ISSUES_TOOL_ID,
        GITHUB_SEARCH_PULL_REQUESTS_TOOL_ID,
        GITHUB_ISSUE_READ_TOOL_ID,
        GITHUB_PULL_REQUEST_READ_TOOL_ID,
      ])
    );
  });

  it('uses code search for current-source research', async () => {
    expect(await githubCodeSearchSkill.getRegistryTools?.()).toContain('github.search_code');
  });
});
