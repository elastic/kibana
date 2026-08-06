/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationAccessControlMode, type UserIdAndName } from '@kbn/agent-builder-common';
import { buildReadAccessFilter } from './query';

const user: UserIdAndName = {
  id: 'user-profile-id',
  username: 'alice',
};

describe('conversation access control query', () => {
  describe('buildReadAccessFilter', () => {
    it('matches public conversations and conversations owned by the user for accessible agents', () => {
      expect(buildReadAccessFilter({ user, agentIds: ['agent-1', 'agent-2'] })).toEqual({
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    term: { 'access_control.access_mode': ConversationAccessControlMode.Public },
                  },
                  {
                    bool: {
                      should: [
                        { term: { user_id: user.id } },
                        {
                          bool: {
                            must_not: { exists: { field: 'user_id' } },
                            filter: { term: { user_name: user.username } },
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            { terms: { agent_id: ['agent-1', 'agent-2'] } },
          ],
        },
      });
    });

    it('omits the user_id clause when the caller has no id but still matches id-less conversations', () => {
      expect(
        buildReadAccessFilter({ user: { username: user.username }, agentIds: ['agent-1'] })
      ).toEqual({
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    term: { 'access_control.access_mode': ConversationAccessControlMode.Public },
                  },
                  {
                    bool: {
                      should: [
                        {
                          bool: {
                            must_not: { exists: { field: 'user_id' } },
                            filter: { term: { user_name: user.username } },
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            { terms: { agent_id: ['agent-1'] } },
          ],
        },
      });
    });
  });
});
