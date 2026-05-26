/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type {
  Project,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  ProjectType,
  UserIdAndName,
} from '@kbn/agent-builder-common';
import { createSpaceDslFilter } from '../../utils/spaces';
import type { ProjectProperties, ProjectStorage } from './storage';
import { createProjectStorage } from './storage';

export type ProjectDocument = {
  _id: string;
  _source: ProjectProperties;
  _seq_no?: number;
  _primary_term?: number;
};

export interface ProjectClient {
  get(projectId: string): Promise<Project>;
  list(options?: { type?: ProjectType; caseId?: string }): Promise<Project[]>;
  create(request: ProjectCreateRequest): Promise<Project>;
  update(request: ProjectUpdateRequest): Promise<Project>;
  findByCaseRef(caseId: string, owner: string): Promise<Project | undefined>;
}

const fromEs = (document: ProjectDocument): Project => {
  const source = document._source;
  return {
    id: document._id,
    title: source.title,
    type: source.type,
    ...(source.case_id && source.case_owner
      ? { case_ref: { case_id: source.case_id, owner: source.case_owner } }
      : {}),
    members: source.members ?? [],
    conversation_ids: source.conversation_ids ?? [],
    created_at: source.created_at,
    updated_at: source.updated_at,
    created_by: {
      id: source.user_id,
      username: source.user_name,
    },
    space: source.space,
  };
};

const toEs = ({
  request,
  user,
  space,
  now,
}: {
  request: ProjectCreateRequest;
  user: UserIdAndName;
  space: string;
  now: Date;
}): ProjectProperties => ({
  title: request.title,
  type: request.type,
  ...(request.case_ref
    ? { case_id: request.case_ref.case_id, case_owner: request.case_ref.owner }
    : {}),
  members: request.members ?? [],
  conversation_ids: request.conversation_ids ?? [],
  user_id: user.id,
  user_name: user.username,
  space,
  created_at: now.toISOString(),
  updated_at: now.toISOString(),
});

export const createProjectClient = ({
  space,
  logger,
  esClient,
  user,
}: {
  space: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  user: UserIdAndName;
}): ProjectClient => {
  const storage = createProjectStorage({ logger, esClient });

  const hasAccess = (document: ProjectDocument) => {
    if (user.id && document._source.user_id === user.id) {
      return true;
    }
    return document._source.user_name === user.username;
  };

  const getDocument = async (projectId: string): Promise<ProjectDocument | undefined> => {
    const response = await storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [createSpaceDslFilter(space), { term: { _id: projectId } }],
        },
      },
    });
    const hit = response.hits.hits[0];
    if (!hit?._source) {
      return undefined;
    }
    return hit as ProjectDocument;
  };

  return {
    async get(projectId) {
      const document = await getDocument(projectId);
      if (!document || !hasAccess(document)) {
        throw new Error(`Project not found: ${projectId}`);
      }
      return fromEs(document);
    },

    async list(options = {}) {
      const filters = [createSpaceDslFilter(space), { term: { user_name: user.username } }];
      if (options.type) {
        filters.push({ term: { type: options.type } });
      }
      if (options.caseId) {
        filters.push({ term: { case_id: options.caseId } });
      }

      const response = await storage.getClient().search({
        track_total_hits: false,
        size: 1000,
        query: { bool: { filter: filters } },
      });

      return response.hits.hits
        .filter((hit): hit is ProjectDocument => Boolean(hit._source))
        .filter(hasAccess)
        .map(fromEs);
    },

    async create(request) {
      const now = new Date();
      const id = request.id ?? uuidv4();
      const document = toEs({ request, user, space, now });

      await storage.getClient().index({ id, document });

      return this.get(id);
    },

    async update(request) {
      const document = await getDocument(request.id);
      if (!document || !hasAccess(document)) {
        throw new Error(`Project not found: ${request.id}`);
      }

      const now = new Date();
      const updated: ProjectProperties = {
        ...document._source,
        ...(request.title !== undefined ? { title: request.title } : {}),
        ...(request.members !== undefined ? { members: request.members } : {}),
        ...(request.conversation_ids !== undefined
          ? { conversation_ids: request.conversation_ids }
          : {}),
        updated_at: now.toISOString(),
      };

      await storage.getClient().index({
        id: request.id,
        document: updated,
        if_seq_no: document._seq_no,
        if_primary_term: document._primary_term,
      });

      return this.get(request.id);
    },

    async findByCaseRef(caseId, owner) {
      const response = await storage.getClient().search({
        track_total_hits: false,
        size: 1,
        query: {
          bool: {
            filter: [
              createSpaceDslFilter(space),
              { term: { user_name: user.username } },
              { term: { case_id: caseId } },
              { term: { case_owner: owner } },
            ],
          },
        },
      });

      const hit = response.hits.hits[0] as ProjectDocument | undefined;
      if (!hit?._source || !hasAccess(hit)) {
        return undefined;
      }
      return fromEs(hit);
    },
  };
};
