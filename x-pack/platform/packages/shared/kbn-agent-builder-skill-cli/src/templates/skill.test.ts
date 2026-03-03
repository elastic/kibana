/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderSkillFile } from './skill';

describe('renderSkillFile', () => {
  it('generates a valid skill definition file', () => {
    const result = renderSkillFile({
      name: 'alert-triage',
      domain: 'security',
      basePath: 'skills/security/alerts',
      description: 'Triage and analyze security alerts',
    });

    expect(result).toContain("import { defineSkillType }");
    expect(result).toContain("export const alertTriageSkill = defineSkillType");
    expect(result).toContain("id: 'alert-triage'");
    expect(result).toContain("name: 'alert-triage'");
    expect(result).toContain("basePath: 'skills/security/alerts'");
    expect(result).toContain('Triage and analyze security alerts');
    expect(result).toContain('Copyright Elasticsearch B.V.');
  });

  it('uses domain default base path when none provided', () => {
    const result = renderSkillFile({
      name: 'log-analysis',
      domain: 'observability',
      basePath: '',
      description: 'Analyze logs',
    });

    expect(result).toContain("basePath: 'skills/observability'");
  });
});
