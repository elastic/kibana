/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getReviewFields } from './get_review_fields';
import type { DissectPattern, DissectAST } from '../types';

// Helper to parse a pattern string into AST
function parsePattern(patternString: string): DissectAST {
  const nodes: DissectAST['nodes'] = [];
  const regex = /%\{([^}]+)\}|([^%]+)/g;
  let match;

  while ((match = regex.exec(patternString)) !== null) {
    if (match[1]) {
      // Field node
      const fieldContent = match[1];
      const modifiers: any = {};
      let fieldName = fieldContent;

      // Parse modifiers
      if (fieldContent.startsWith('+')) {
        modifiers.append = true;
        fieldName = fieldContent.slice(1);
      }
      if (fieldContent.startsWith('?')) {
        modifiers.skip = true;
        modifiers.namedSkip = true;
        fieldName = fieldContent.slice(1);
      }
      if (fieldContent.endsWith('->')) {
        modifiers.rightPadding = true;
        fieldName = fieldName.slice(0, -2);
      }
      if (fieldName === '') {
        modifiers.skip = true;
      }

      nodes.push({
        type: 'field',
        name: fieldName,
        modifiers: Object.keys(modifiers).length > 0 ? modifiers : undefined,
      });
    } else if (match[2]) {
      // Literal node
      nodes.push({
        type: 'literal',
        value: match[2],
      });
    }
  }

  return { nodes };
}

describe('getReviewFields', () => {
  it('extracts fields with example values and positions', () => {
    const pattern: DissectPattern = {
      ast: parsePattern('%{field_1} %{field_2} %{field_3}'),
      fields: [
        {
          name: 'field_1',
          values: ['192.168.1.1', '10.0.0.1', '172.16.0.1'],
          position: 0,
        },
        {
          name: 'field_2',
          values: ['GET', 'POST', 'PUT'],
          position: 1,
        },
        {
          name: 'field_3',
          values: ['/index.html', '/api/data', '/update'],
          position: 2,
        },
      ],
    };

    const reviewFields = getReviewFields(pattern, 5);

    expect(reviewFields).toEqual({
      field_1: {
        example_values: ['192.168.1.1', '10.0.0.1', '172.16.0.1'],
        position: 0,
      },
      field_2: {
        example_values: ['GET', 'POST', 'PUT'],
        position: 1,
      },
      field_3: {
        example_values: ['/index.html', '/api/data', '/update'],
        position: 2,
      },
    });
  });

  it('limits example values to numExamples', () => {
    const pattern: DissectPattern = {
      ast: parsePattern('%{field_1}'),
      fields: [
        {
          name: 'field_1',
          values: ['val1', 'val2', 'val3', 'val4', 'val5', 'val6'],
          position: 0,
        },
      ],
    };

    const reviewFields = getReviewFields(pattern, 3);

    expect(reviewFields.field_1.example_values).toEqual(['val1', 'val2', 'val3']);
  });

  it('skips fields with skip modifier', () => {
    const pattern: DissectPattern = {
      ast: parsePattern('%{field_1} %{?field_2} %{field_3}'),
      fields: [
        {
          name: 'field_1',
          values: ['value1'],
          position: 0,
        },
        {
          name: 'field_2',
          values: ['skipped'],
          position: 1,
          modifiers: { skip: true },
        },
        {
          name: 'field_3',
          values: ['value3'],
          position: 2,
        },
      ],
    };

    const reviewFields = getReviewFields(pattern, 5);

    expect(reviewFields).toEqual({
      field_1: {
        example_values: ['value1'],
        position: 0,
      },
      field_3: {
        example_values: ['value3'],
        position: 2,
      },
    });
  });

  it('deduplicates example values', () => {
    const pattern: DissectPattern = {
      ast: parsePattern('%{field_1}'),
      fields: [
        {
          name: 'field_1',
          values: ['GET', 'POST', 'GET', 'PUT', 'GET'],
          position: 0,
        },
      ],
    };

    const reviewFields = getReviewFields(pattern, 5);

    expect(reviewFields.field_1.example_values).toEqual(['GET', 'POST', 'PUT']);
  });
});
