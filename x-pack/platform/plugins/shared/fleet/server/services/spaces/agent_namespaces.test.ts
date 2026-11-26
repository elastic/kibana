/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SPACES_ID } from '../../../common/constants';
import type { Agent } from '../../types';

import {
  agentsKueryNamespaceFilter,
  agentsNamespaceQuery,
  buildFilterWithNamespace,
  isAgentInNamespace,
} from './agent_namespaces';
import { isSpaceAwarenessEnabled } from './helpers';

jest.mock('./helpers');

describe('isAgentInNamespace', () => {
  describe('with isSpaceAwarenessEnabled is false', () => {
    beforeEach(() => {
      jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(false);
    });

    it('returns true even if the agent is in a different space', async () => {
      const agent = { id: '123', namespaces: ['default', 'space1'] } as Agent;
      expect(await isAgentInNamespace(agent, 'space2')).toEqual(true);
    });
  });

  describe('with the isSpaceAwarenessEnabled return true', () => {
    beforeEach(() => {
      jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(true);
    });

    describe('when the namespace is defined', () => {
      it('returns true in a custom space if the agent namespaces include the namespace', async () => {
        const agent = { id: '123', namespaces: ['default', 'space1'] } as Agent;
        expect(await isAgentInNamespace(agent, 'space1')).toEqual(true);
      });

      it('returns false in a custom space if the agent namespaces do not include the namespace', async () => {
        const agent = { id: '123', namespaces: ['default', 'space1'] } as Agent;
        expect(await isAgentInNamespace(agent, 'space2')).toEqual(false);
      });

      it('returns true in the default space if the agent has zero length namespaces', async () => {
        const agent = { id: '123', namespaces: [] as string[] } as Agent;
        expect(await isAgentInNamespace(agent, 'default')).toEqual(true);
      });

      it('returns false in a custom space if the agent has zero length namespaces', async () => {
        const agent = { id: '123', namespaces: [] as string[] } as Agent;
        expect(await isAgentInNamespace(agent, 'space1')).toEqual(false);
      });

      it('returns true in the default space if the agent does not have namespaces', async () => {
        const agent = { id: '123' } as Agent;
        expect(await isAgentInNamespace(agent, 'default')).toEqual(true);
      });

      it('returns false in a custom space if the agent does not have namespaces', async () => {
        const agent = { id: '123' } as Agent;
        expect(await isAgentInNamespace(agent, 'space1')).toEqual(false);
      });

      it('returns true in the default space if the agent has all spaces namespaces', async () => {
        const agent = { id: '123', namespaces: [ALL_SPACES_ID] } as Agent;
        expect(await isAgentInNamespace(agent, 'default')).toEqual(true);
      });

      it('returns true in a custom space if the agent has all spaces namespaces', async () => {
        const agent = { id: '123', namespaces: [ALL_SPACES_ID] } as Agent;
        expect(await isAgentInNamespace(agent, 'space1')).toEqual(true);
      });
    });

    describe('when the namespace is undefined', () => {
      it('returns true if the agent does not have namespaces', async () => {
        const agent = { id: '123' } as Agent;
        expect(await isAgentInNamespace(agent)).toEqual(true);
      });

      it('returns true if the agent has zero length namespaces', async () => {
        const agent = { id: '123', namespaces: [] as string[] } as Agent;
        expect(await isAgentInNamespace(agent)).toEqual(true);
      });

      it('returns true if the agent namespaces include the default one', async () => {
        const agent = { id: '123', namespaces: ['default'] } as Agent;
        expect(await isAgentInNamespace(agent)).toEqual(true);
      });

      it('returns false if the agent namespaces include the default one', async () => {
        const agent = { id: '123', namespaces: ['space1'] } as Agent;
        expect(await isAgentInNamespace(agent)).toEqual(false);
      });
    });
  });
});

describe('agentsKueryNamespaceFilter', () => {
  describe('with isSpaceAwarenessEnabled returning false', () => {
    beforeEach(() => {
      jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(false);
    });

    it('returns undefined', async () => {
      expect(await agentsKueryNamespaceFilter('space1')).toBeUndefined();
    });
  });

  describe('with isSpaceAwarenessEnabled returning true', () => {
    beforeEach(() => {
      jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(true);
    });

    it('returns undefined if the namespace is undefined', async () => {
      expect(await agentsKueryNamespaceFilter()).toBeUndefined();
    });

    it('returns a kuery for the default space', async () => {
      expect(await agentsKueryNamespaceFilter('default')).toEqual(
        '(namespaces:"default" or namespaces:"*" or not namespaces:*)'
      );
    });

    it('returns a kuery for custom spaces', async () => {
      expect(await agentsKueryNamespaceFilter('space1')).toEqual(
        'namespaces:(space1) or namespaces:"*"'
      );
    });
  });
});

describe('agentsNamespaceQuery', () => {
  describe('with isSpaceAwarenessEnabled returning false', () => {
    beforeEach(() => {
      jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(false);
    });

    it('returns no query', async () => {
      expect(await agentsNamespaceQuery('space1')).toBeUndefined();
    });
  });

  describe('with isSpaceAwarenessEnabled returning true', () => {
    beforeEach(() => {
      jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(true);
    });

    it('returns no query without a namespace, or for all spaces', async () => {
      expect(await agentsNamespaceQuery()).toBeUndefined();
      expect(await agentsNamespaceQuery('*')).toBeUndefined();
    });

    it('matches the agents of the default space, of all spaces, and of none', async () => {
      expect(await agentsNamespaceQuery('default')).toEqual({
        bool: {
          should: [
            { term: { namespaces: 'default' } },
            { term: { namespaces: ALL_SPACES_ID } },
            { bool: { must_not: { exists: { field: 'namespaces' } } } },
          ],
          minimum_should_match: 1,
        },
      });
    });

    it('matches the agents of a space and of all spaces, and nothing else', async () => {
      expect(await agentsNamespaceQuery('space1')).toEqual({
        bool: {
          should: [{ term: { namespaces: 'space1' } }, { term: { namespaces: ALL_SPACES_ID } }],
          minimum_should_match: 1,
        },
      });
    });

    it.each(['null', 'a:b', 'my space', 'not', 'a*'])(
      'takes the space id %j as the name of a space',
      async (spaceId) => {
        expect(await agentsNamespaceQuery(spaceId)).toEqual({
          bool: {
            should: [{ term: { namespaces: spaceId } }, { term: { namespaces: ALL_SPACES_ID } }],
            minimum_should_match: 1,
          },
        });
      }
    );
  });
});

describe('buildFilterWithNamespace', () => {
  it('returns undefined when both namespace filter and kuery are undefined', () => {
    expect(buildFilterWithNamespace(undefined, undefined)).toBeUndefined();
  });

  it('returns undefined when namespace filter is undefined and kuery is empty', () => {
    expect(buildFilterWithNamespace(undefined, '')).toBeUndefined();
  });

  it('returns undefined when namespace filter is undefined and kuery is whitespace', () => {
    expect(buildFilterWithNamespace(undefined, '   ')).toBeUndefined();
  });

  it('returns only the namespace filter wrapped in parentheses when kuery is undefined', () => {
    expect(buildFilterWithNamespace('namespaces:(space1)', undefined)).toEqual(
      '(namespaces:(space1))'
    );
  });

  it('returns only the namespace filter wrapped in parentheses when kuery is empty', () => {
    expect(buildFilterWithNamespace('namespaces:(space1)', '')).toEqual('(namespaces:(space1))');
  });

  it('returns only the kuery wrapped in parentheses when namespace filter is undefined', () => {
    expect(buildFilterWithNamespace(undefined, 'status:online')).toEqual('(status:online)');
  });

  it('wraps both parts in parentheses before joining with AND', () => {
    expect(buildFilterWithNamespace('namespaces:(space1)', 'status:online')).toEqual(
      '(namespaces:(space1)) AND (status:online)'
    );
  });

  it('prevents KQL precedence issues when kuery contains OR operators', () => {
    const namespaceFilter = 'namespaces:(custom_space)';
    const kuery = 'status:online or status:error or status:offline';
    const result = buildFilterWithNamespace(namespaceFilter, kuery);
    expect(result).toEqual(
      '(namespaces:(custom_space)) AND (status:online or status:error or status:offline)'
    );
  });

  it('handles the default space namespace filter with OR operators in kuery', () => {
    const namespaceFilter = '(namespaces:"default" or namespaces:"*" or not namespaces:*)';
    const kuery =
      'status:online or (status:error or status:degraded) or status:orphaned or status:offline';
    const result = buildFilterWithNamespace(namespaceFilter, kuery);
    expect(result).toEqual(
      '((namespaces:"default" or namespaces:"*" or not namespaces:*)) AND (status:online or (status:error or status:degraded) or status:orphaned or status:offline)'
    );
  });
});
