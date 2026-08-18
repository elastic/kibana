/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import { buildActionDetailsQuery } from './query.action_details.dsl';
import { ACTIONS_INDEX } from '../../../../../../common/constants';

jest.mock('../../../../../utils/build_query', () => ({
  getQueryFilter: jest.fn(({ filter }: { filter: string }) => ({
    query_string: {
      query: filter,
    },
  })),
}));

describe('buildActionDetailsQuery', () => {
  it('returns the index as a single-element array (matching the other factories)', () => {
    const withTemplate = buildActionDetailsQuery({
      actionId: 'action-1',
      componentTemplateExists: true,
      spaceId: 'default',
    });
    expect(withTemplate.index).toEqual([`${ACTIONS_INDEX}*`]);

    const withoutTemplate = buildActionDetailsQuery({
      actionId: 'action-1',
      componentTemplateExists: false,
      spaceId: 'default',
    });
    expect(withoutTemplate.index).toEqual([AGENT_ACTIONS_INDEX]);
  });

  it('builds a term filter for actionId', () => {
    const result = buildActionDetailsQuery({
      actionId: 'action id',
      componentTemplateExists: true,
      spaceId: 'default',
    });

    expect(result.query).toEqual({
      bool: {
        filter: [{ term: { action_id: 'action id' } }],
      },
    });
  });

  it('keeps user kuery separate from the actionId filter', () => {
    const result = buildActionDetailsQuery({
      actionId: 'action-1',
      componentTemplateExists: true,
      kuery: 'user_id: "elastic"',
      spaceId: 'default',
    });

    expect(result.query).toEqual({
      bool: {
        filter: [
          { term: { action_id: 'action-1' } },
          { query_string: { query: 'user_id: "elastic"' } },
        ],
      },
    });
  });
});
