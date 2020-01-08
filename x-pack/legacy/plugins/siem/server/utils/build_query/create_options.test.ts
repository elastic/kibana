/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';

import { defaultIndexPattern } from '../../../default_index_pattern';
import { Direction } from '../../graphql/types';
import { RequestOptions } from '../../lib/framework';

import { Args, Configuration, createOptions, FieldNodes } from './create_options';

describe('createOptions', () => {
  let source: Configuration;
  let args: Args;
  let info: FieldNodes;
  beforeEach(() => {
    source = {
      configuration: {
        fields: {
          host: 'host-1',
          container: 'container-1',
          message: ['message-1'],
          pod: 'pod-1',
          tiebreaker: 'tiebreaker',
          timestamp: 'timestamp-1',
        },
      },
    };
    args = {
      defaultIndex: defaultIndexPattern,
      pagination: {
        limit: 5,
      },
      timerange: {
        from: 10,
        to: 0,
        interval: '12 hours ago',
      },
      sortField: { sortFieldId: 'sort-1', direction: Direction.asc },
    };
    info = {
      fieldNodes: [
        {
          name: {
            kind: 'Name',
            value: 'value-1',
          },
          kind: 'Field',
        },
      ],
    };
  });

  test('should create options given all input including sort field', () => {
    const options = createOptions(source, args, info);
    const expected: RequestOptions = {
      defaultIndex: defaultIndexPattern,
      sourceConfiguration: {
        fields: {
          host: 'host-1',
          container: 'container-1',
          message: ['message-1'],
          pod: 'pod-1',
          tiebreaker: 'tiebreaker',
          timestamp: 'timestamp-1',
        },
      },
      sortField: { sortFieldId: 'sort-1', direction: Direction.asc },
      pagination: {
        limit: 5,
      },
      filterQuery: {},
      fields: [],
      timerange: {
        from: 10,
        to: 0,
        interval: '12 hours ago',
      },
    };
    expect(options).toEqual(expected);
  });

  test('should create options given all input except sorting', () => {
    const argsWithoutSort: Args = omit('sortField', args);
    const options = createOptions(source, argsWithoutSort, info);
    const expected: RequestOptions = {
      defaultIndex: defaultIndexPattern,
      sourceConfiguration: {
        fields: {
          host: 'host-1',
          container: 'container-1',
          message: ['message-1'],
          pod: 'pod-1',
          tiebreaker: 'tiebreaker',
          timestamp: 'timestamp-1',
        },
      },
      pagination: {
        limit: 5,
      },
      filterQuery: {},
      fields: [],
      timerange: {
        from: 10,
        to: 0,
        interval: '12 hours ago',
      },
    };
    expect(options).toEqual(expected);
  });
});
