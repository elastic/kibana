/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  collectReferencedContentRefineIssues,
  REFERENCED_CONTENT_REFINE_ISSUE_CODE,
} from './referenced_content_refine';

describe('collectReferencedContentRefineIssues', () => {
  it('flags relativePath when it does not start with ./', () => {
    const issues = collectReferencedContentRefineIssues([
      { name: 'ok', relativePath: '/absolute' },
    ]);
    expect(issues).toContainEqual({
      code: REFERENCED_CONTENT_REFINE_ISSUE_CODE.PATH_PROTOCOL,
      itemIndex: 0,
      field: 'relativePath',
    });
  });

  it('flags path traversal', () => {
    const issues = collectReferencedContentRefineIssues([
      { name: 'x', relativePath: './foo/../bar' },
    ]);
    expect(issues).toContainEqual({
      code: REFERENCED_CONTENT_REFINE_ISSUE_CODE.PATH_TRAVERSAL,
      itemIndex: 0,
      field: 'relativePath',
    });
  });

  it('flags reserved skill name at root', () => {
    const issues = collectReferencedContentRefineIssues([{ name: 'Skill', relativePath: './' }]);
    expect(issues).toContainEqual({
      code: REFERENCED_CONTENT_REFINE_ISSUE_CODE.RESERVED_SKILL_NAME,
      itemIndex: 0,
      field: 'name',
    });
  });

  it('flags duplicate normalized paths', () => {
    const issues = collectReferencedContentRefineIssues([
      { name: 'dup', relativePath: './templates' },
      { name: 'dup', relativePath: './templates/' },
    ]);
    const dupes = issues.filter(
      (i) => i.code === REFERENCED_CONTENT_REFINE_ISSUE_CODE.DUPLICATE_PATH
    );
    expect(dupes).toHaveLength(2);
    expect(dupes.map((d) => d.itemIndex).sort()).toEqual([0, 1]);
  });

  it('returns no issues for valid items', () => {
    expect(
      collectReferencedContentRefineIssues([{ name: 'readme', relativePath: './docs' }])
    ).toEqual([]);
  });
});
