/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { isSkillNotFoundError } from '@kbn/agent-builder-common';
import type { WritableSkillProvider } from '../skill_provider';
import { createClient } from './client';
import { convertPersistedSkill } from './converter';

export const createPersistedSkillProvider = ({
  space,
  esClient,
  logger,
}: {
  space: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}): WritableSkillProvider => {
  const skillClient = createClient({ space, esClient, logger });

  return {
    id: 'persisted',
    readonly: false,
    async has(skillId) {
      return skillClient.has(skillId);
    },
    async get(skillId) {
      try {
        const skill = await skillClient.get(skillId);
        return convertPersistedSkill(skill);
      } catch (e) {
        if (isSkillNotFoundError(e)) {
          return undefined;
        }
        throw e;
      }
    },
    async list() {
      const skills = await skillClient.list();
      return skills.map(convertPersistedSkill);
    },
    async create(createRequest) {
      const skill = await skillClient.create(createRequest);
      return convertPersistedSkill(skill);
    },
    async update(skillId, updateRequest) {
      const skill = await skillClient.update(skillId, updateRequest);
      return convertPersistedSkill(skill);
    },
    async delete(skillId) {
      return skillClient.delete(skillId);
    },
  };
};
