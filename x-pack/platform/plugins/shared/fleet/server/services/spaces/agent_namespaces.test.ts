/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '../../types';

import { agentsKueryNamespaceFilter, isAgentInNamespace } from './agent_namespaces';
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
        'namespaces:(default) or not namespaces:*'
      );
    });

    it('returns a kuery for custom spaces', async () => {
      expect(await agentsKueryNamespaceFilter('space1')).toEqual('namespaces:(space1)');
    });
  });
});
