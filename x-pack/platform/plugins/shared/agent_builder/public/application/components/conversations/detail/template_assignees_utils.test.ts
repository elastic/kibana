/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseTemplateAssignees } from './template_assignees_utils';

describe('template_assignees_utils', () => {
  describe('parseTemplateAssignees', () => {
    it('returns an empty array for non-array values', () => {
      expect(parseTemplateAssignees(undefined)).toEqual([]);
      expect(parseTemplateAssignees('analyst_a')).toEqual([]);
    });

    it('parses uid and username entries', () => {
      expect(
        parseTemplateAssignees([
          { uid: 'u1', username: 'analyst_a' },
          { uid: 'u2', username: 'analyst_b' },
        ])
      ).toEqual([
        { uid: 'u1', username: 'analyst_a' },
        { uid: 'u2', username: 'analyst_b' },
      ]);
    });

    it('supports legacy id entries', () => {
      expect(parseTemplateAssignees([{ id: 'u1', username: 'analyst_a' }])).toEqual([
        { uid: 'u1', username: 'analyst_a' },
      ]);
    });

    it('filters invalid entries', () => {
      expect(
        parseTemplateAssignees([
          { uid: 'u1', username: 'analyst_a' },
          { uid: 'u2' },
          null,
          'invalid',
        ])
      ).toEqual([{ uid: 'u1', username: 'analyst_a' }]);
    });
  });
});
