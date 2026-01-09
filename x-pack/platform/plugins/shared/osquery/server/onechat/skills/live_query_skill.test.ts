/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLiveQuerySkill } from './live_query_skill';
import type { GetOsqueryAppContextFn } from './utils';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

describe('getLiveQuerySkill', () => {
  const mockGetOsqueryContext: GetOsqueryAppContextFn = () => null;

  it('should create a skill with correct namespace', () => {
    const skill = getLiveQuerySkill(mockGetOsqueryContext);
    expect(skill.namespace).toBe('osquery.live_query');
    expect(skill.name).toBe('Osquery Live Query');
    expect(skill.description).toBe('Run live osquery queries against agents');
  });

  it('should include run_live_query tool', () => {
    const skill = getLiveQuerySkill(mockGetOsqueryContext);
    expect(skill.tools).toHaveLength(1);
    expect(skill.tools[0].name).toBe('run_live_query');
  });

  it('should have instructional content', () => {
    const skill = getLiveQuerySkill(mockGetOsqueryContext);
    expect(skill.content).toContain('# Osquery Live Query Guide');
    expect(skill.content).toContain('run_live_query');
  });
});





