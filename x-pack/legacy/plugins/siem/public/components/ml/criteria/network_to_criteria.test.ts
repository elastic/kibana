/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FlowTarget } from '../../../graphql/types';
import { CriteriaFields } from '../types';
import { networkToCriteria } from './network_to_criteria';

describe('network_to_criteria', () => {
  test('converts a network to a criteria of source if given a source', () => {
    const expectedCriteria: CriteriaFields[] = [
      {
        fieldName: 'source.ip',
        fieldValue: '127.0.0.1',
      },
    ];
    expect(networkToCriteria('127.0.0.1', FlowTarget.source)).toEqual(expectedCriteria);
  });

  test('converts a network to a criteria of destination if given a destination', () => {
    const expectedCriteria: CriteriaFields[] = [
      {
        fieldName: 'destination.ip',
        fieldValue: '127.0.0.1',
      },
    ];
    expect(networkToCriteria('127.0.0.1', FlowTarget.destination)).toEqual(expectedCriteria);
  });

  test('returns an empty array if the Flow Type is anything else', () => {
    expect(networkToCriteria('127.0.0.1', FlowTarget.server)).toEqual([]);
  });
});
