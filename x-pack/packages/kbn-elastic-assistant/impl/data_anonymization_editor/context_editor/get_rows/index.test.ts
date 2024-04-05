/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SelectedPromptContext } from '../../../assistant/prompt_context/types';
import { ContextEditorRow } from '../types';
import { getRows } from '.';

describe('getRows', () => {
  const defaultArgs: {
    anonymizationFields: SelectedPromptContext['contextAnonymizationFields'];
    rawData: Record<string, string[]> | null;
  } = {
    anonymizationFields: {
      total: 4,
      page: 1,
      perPage: 100,
      data: [
        {
          field: 'event.action',
          id: 'test',
          allowed: true,
          anonymized: false,
          createdAt: '',
          timestamp: '',
        },
        {
          field: 'user.name',
          id: 'test1',
          allowed: true,
          anonymized: true,
          createdAt: '',
          timestamp: '',
        },
        {
          field: 'other.field',
          id: 'test2',
          allowed: true,
          anonymized: false,
          createdAt: '',
          timestamp: '',
        },
        {
          field: 'host.ip',
          id: 'test3',
          allowed: false,
          anonymized: true,
          createdAt: '',
          timestamp: '',
        },
      ],
    },
    rawData: {
      'event.category': ['process'], // event.category is not in the allow list, nor is it in the allowReplacement list
      'event.action': ['process_stopped', 'stop'], // event.action is in the allow list, but not the allowReplacement list
      'user.name': ['max'], // user.name is in the allow list and the allowReplacement list
    },
  };

  it('returns only the allowed fields if no rawData is provided', () => {
    const expected: ContextEditorRow[] = [
      {
        allowed: true,
        anonymized: false,
        denied: false,
        field: 'event.action',
        rawValues: [],
      },
      {
        allowed: true,
        anonymized: false,
        denied: false,
        field: 'other.field',
        rawValues: [],
      },
      {
        allowed: true,
        anonymized: true,
        denied: false,
        field: 'user.name',
        rawValues: [],
      },
    ];

    const nullRawData: {
      anonymizationFields: SelectedPromptContext['contextAnonymizationFields'];
      rawData: Record<string, string[]> | null;
    } = {
      ...defaultArgs,
      rawData: null,
    };

    const rows = getRows(nullRawData);

    expect(rows).toEqual(expected);
  });

  it('returns the expected metadata and raw values', () => {
    const expected: ContextEditorRow[] = [
      {
        allowed: true,
        anonymized: false,
        denied: false,
        field: 'event.action',
        rawValues: ['process_stopped', 'stop'],
      },
      {
        allowed: false,
        anonymized: false,
        denied: true,
        field: 'event.category',
        rawValues: ['process'],
      },
      {
        allowed: true,
        anonymized: true,
        denied: false,
        field: 'user.name',
        rawValues: ['max'],
      },
    ];

    const rows = getRows(defaultArgs);

    expect(rows).toEqual(expected);
  });
});
