/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Under the Elastic License 2.0, the
 * GNU AGPLv3, or the SSPLv1, at your election: the "Elastic License 2.0", the
 * "GNU Affero General Public License v3.0 only", or the "Server Side Public
 * License, v 1"; you may not use this file except in compliance with, at your
 * election, the "Elastic License 2.0", the "GNU Affero General Public License
 * v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFleetPackageSkillId, parseFleetSkillYaml } from './fleet_skill_parse';

describe('Fleet skill assets (AB-005)', () => {
  const SKILL_MD = `---
name: sdlc-triage
description: Triage incoming SDLC signals
base_path: skills/sdlc_intel
---
# SDLC Triage

Prioritize the alert queue by severity.
`;

  it('parses frontmatter and body into a persisted-skill create request', () => {
    const req = parseFleetSkillYaml(
      { fileName: 'sdlc-triage/SKILL.md', content: SKILL_MD },
      'fleet-default-sdlc_intel-sdlc-triage',
      'sdlc_intel'
    );
    expect(req.name).toBe('sdlc-triage');
    expect(req.description).toBe('Triage incoming SDLC signals');
    expect(req.base_path).toBe('skills/sdlc_intel');
    expect(req.content).toContain('Prioritize the alert queue');
    expect(req.content).not.toContain('---');
    expect(req.plugin_id).toBe('fleet:sdlc_intel');
  });

  it('derives deterministic, namespaced skill ids that never collide across packages', () => {
    const a = getFleetPackageSkillId({
      pkgName: 'sdlc_intel',
      spaceId: 'default',
      fileName: 'sdlc-triage/SKILL.md',
    });
    const b = getFleetPackageSkillId({
      pkgName: 'other_pkg',
      spaceId: 'default',
      fileName: 'sdlc-triage/SKILL.md',
    });
    expect(a).toBe('fleet-default-sdlc_intel-sdlc-triage');
    expect(a).not.toBe(b);
  });

  it('throws on empty content after frontmatter', () => {
    expect(() =>
      parseFleetSkillYaml(
        { fileName: 'empty/SKILL.md', content: '---\nname: empty\n---\n' },
        'x',
        'pkg'
      )
    ).toThrow(/empty content/);
  });

  it('falls back to directory name and package defaults when frontmatter is sparse', () => {
    const req = parseFleetSkillYaml(
      { fileName: 'bare/SKILL.md', content: 'Just body text.' },
      'id1',
      'pkg'
    );
    expect(req.name).toBe('bare');
    expect(req.description).toContain('bare');
    expect(req.plugin_id).toBe('fleet:pkg');
  });
});
