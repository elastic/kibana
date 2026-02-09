/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { PublicSkillDefinition } from '@kbn/agent-builder-common';
import type { WritableSkillProvider, SkillProviderFn } from '../skill_provider';
import { createClient } from './client';
import type { SkillPersistedDefinition } from './client';

/**
 * Converts a persisted skill definition to a PublicSkillDefinition.
 */
const toPublicDefinition = (skill: SkillPersistedDefinition): PublicSkillDefinition => {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    content: skill.content,
    referenced_content: skill.referenced_content,
    tool_ids: skill.tool_ids,
    readonly: false,
  };
};

export const createPersistedSkillProviderFn =
  (opts: { logger: Logger; esClient: ElasticsearchClient }): SkillProviderFn<false> =>
  ({ space }) => {
    return createPersistedSkillProvider({
      ...opts,
      space,
    });
  };

export const createPersistedSkillProvider = ({
  logger,
  esClient,
  space,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
  space: string;
}): WritableSkillProvider => {
  const skillClient = createClient({ space, esClient, logger });

  return {
    id: 'persisted',
    readonly: false,

    async has(skillId: string) {
      return skillClient.has(skillId);
    },

    async get(skillId: string) {
      try {
        const skill = await skillClient.get(skillId);
        return toPublicDefinition(skill);
      } catch {
        return undefined;
      }
    },

    async list() {
      const skills = await skillClient.list();
      return skills.map(toPublicDefinition);
    },

    async create(createRequest) {
      const skill = await skillClient.create(createRequest);
      return toPublicDefinition(skill);
    },

    async update(skillId, updateRequest) {
      const skill = await skillClient.update(skillId, updateRequest);
      return toPublicDefinition(skill);
    },

    async delete(skillId: string) {
      return skillClient.delete(skillId);
    },
  };
};
