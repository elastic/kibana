/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '../../../common/types/domain';
import { format } from './format';

describe('Jira formatter', () => {
  const theCase = {
    tags: ['tag'],
    connector: { fields: { priority: 'High', issueType: 'Task', parent: null } },
  } as Case;

  it('it formats correctly', async () => {
    const res = await format(theCase, []);
    expect(res).toEqual({ ...theCase.connector.fields, otherFields: null, labels: theCase.tags });
  });

  it('it formats correctly when fields do not exist ', async () => {
    const invalidFields = { tags: ['tag'], connector: { fields: null } } as Case;
    const res = await format(invalidFields, []);
    expect(res).toEqual({
      priority: null,
      issueType: null,
      parent: null,
      otherFields: null,
      labels: theCase.tags,
    });
  });

  it('it replace white spaces with hyphens on tags', async () => {
    const res = await format({ ...theCase, tags: ['a tag with spaces'] }, []);
    expect(res).toEqual({
      ...theCase.connector.fields,
      otherFields: null,
      labels: ['a-tag-with-spaces'],
    });
  });

  it('it formats correctly with otherFields', async () => {
    const caseWithOtherFields = {
      ...theCase,
      connector: {
        fields: {
          ...theCase.connector.fields,
          otherFields: '{"customfield_123456":"Blue team"}',
        },
      },
    } as Case;

    const res = await format(caseWithOtherFields, []);
    expect(res).toEqual({ ...caseWithOtherFields.connector.fields, labels: theCase.tags });
  });
});
