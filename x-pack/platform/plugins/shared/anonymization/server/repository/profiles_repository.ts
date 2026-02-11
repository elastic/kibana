/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnonymizationProfile, FieldRule } from '@kbn/anonymization-common';
import { ANONYMIZATION_PROFILES_INDEX } from '../../common';

/** Shape of an ES document in the profiles index. */
interface EsProfileDocument {
  id: string;
  name: string;
  description?: string;
  target_type: string;
  target_id: string;
  rules: {
    field_rules: Array<{
      field: string;
      allowed: boolean;
      anonymized: boolean;
      entity_class?: string;
    }>;
    regex_rules: Array<{
      id: string;
      type: string;
      entity_class: string;
      pattern: string;
      enabled: boolean;
    }>;
    ner_rules: Array<{
      id: string;
      type: string;
      model_id: string;
      allowed_entity_classes: string[];
      enabled: boolean;
    }>;
  };
  salt_id: string;
  namespace: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  migration?: {
    ai_anonymization_settings?: {
      applied_at?: string;
    };
  };
}

interface CreateProfileParams {
  name: string;
  description?: string;
  targetType: 'data_view' | 'index_pattern' | 'index';
  targetId: string;
  rules: {
    fieldRules: FieldRule[];
    regexRules?: Array<{
      id: string;
      type: 'regex';
      entityClass: string;
      pattern: string;
      enabled: boolean;
    }>;
    nerRules?: Array<{
      id: string;
      type: 'ner';
      modelId: string;
      allowedEntityClasses: string[];
      enabled: boolean;
    }>;
  };
  saltId: string;
  namespace: string;
  createdBy: string;
}

interface UpdateProfileParams {
  name?: string;
  description?: string;
  rules?: CreateProfileParams['rules'];
  updatedBy: string;
}

interface FindProfilesParams {
  namespace: string;
  filter?: string;
  targetType?: string;
  targetId?: string;
  sortField?: 'created_at' | 'name' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

interface FindProfilesResult {
  page: number;
  perPage: number;
  total: number;
  data: AnonymizationProfile[];
}

/**
 * Repository for CRUD operations on Anonymization Profiles.
 * Operates directly against the `.anonymization-profiles` system index.
 */
export class ProfilesRepository {
  constructor(private readonly esClient: ElasticsearchClient) {}

  /**
   * Creates a new profile. Enforces uniqueness per (namespace, target_type, target_id).
   * @throws ConflictError if a profile for the same target already exists in the space.
   */
  async create(params: CreateProfileParams): Promise<AnonymizationProfile> {
    // Check uniqueness: (namespace, target_type, target_id)
    const existing = await this.findByTarget(params.namespace, params.targetType, params.targetId);
    if (existing) {
      const err = new Error(
        `A profile already exists for target (${params.targetType}, ${params.targetId}) in space ${params.namespace}`
      );
      (err as any).statusCode = 409;
      throw err;
    }

    const now = new Date().toISOString();
    const id = uuidv4();

    const doc: EsProfileDocument = {
      id,
      name: params.name,
      description: params.description,
      target_type: params.targetType,
      target_id: params.targetId,
      rules: {
        field_rules: params.rules.fieldRules.map((r) => ({
          field: r.field,
          allowed: r.allowed,
          anonymized: r.anonymized,
          entity_class: r.entityClass,
        })),
        regex_rules: (params.rules.regexRules ?? []).map((r) => ({
          id: r.id,
          type: r.type,
          entity_class: r.entityClass,
          pattern: r.pattern,
          enabled: r.enabled,
        })),
        ner_rules: (params.rules.nerRules ?? []).map((r) => ({
          id: r.id,
          type: r.type,
          model_id: r.modelId,
          allowed_entity_classes: r.allowedEntityClasses,
          enabled: r.enabled,
        })),
      },
      salt_id: params.saltId,
      namespace: params.namespace,
      created_at: now,
      updated_at: now,
      created_by: params.createdBy,
      updated_by: params.createdBy,
    };

    await this.esClient.index({
      index: ANONYMIZATION_PROFILES_INDEX,
      id,
      document: doc,
      refresh: 'wait_for',
    });

    return this.toProfile(doc);
  }

  /**
   * Retrieves a profile by ID within a namespace.
   */
  async get(namespace: string, profileId: string): Promise<AnonymizationProfile | null> {
    try {
      const result = await this.esClient.get<EsProfileDocument>({
        index: ANONYMIZATION_PROFILES_INDEX,
        id: profileId,
      });

      const doc = result._source;
      if (!doc || doc.namespace !== namespace) {
        return null;
      }

      return this.toProfile(doc);
    } catch (err) {
      if (err?.meta?.statusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Updates an existing profile. target_type and target_id are immutable.
   */
  async update(
    namespace: string,
    profileId: string,
    params: UpdateProfileParams
  ): Promise<AnonymizationProfile | null> {
    const existing = await this.get(namespace, profileId);
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    const updateDoc: Partial<EsProfileDocument> = {
      updated_at: now,
      updated_by: params.updatedBy,
    };

    if (params.name !== undefined) {
      updateDoc.name = params.name;
    }
    if (params.description !== undefined) {
      updateDoc.description = params.description;
    }
    if (params.rules !== undefined) {
      updateDoc.rules = {
        field_rules: params.rules.fieldRules.map((r) => ({
          field: r.field,
          allowed: r.allowed,
          anonymized: r.anonymized,
          entity_class: r.entityClass,
        })),
        regex_rules: (params.rules.regexRules ?? []).map((r) => ({
          id: r.id,
          type: r.type,
          entity_class: r.entityClass,
          pattern: r.pattern,
          enabled: r.enabled,
        })),
        ner_rules: (params.rules.nerRules ?? []).map((r) => ({
          id: r.id,
          type: r.type,
          model_id: r.modelId,
          allowed_entity_classes: r.allowedEntityClasses,
          enabled: r.enabled,
        })),
      };
    }

    await this.esClient.update({
      index: ANONYMIZATION_PROFILES_INDEX,
      id: profileId,
      doc: updateDoc,
      refresh: 'wait_for',
    });

    return this.get(namespace, profileId);
  }

  /**
   * Deletes a profile by ID within a namespace.
   */
  async delete(namespace: string, profileId: string): Promise<boolean> {
    const existing = await this.get(namespace, profileId);
    if (!existing) {
      return false;
    }

    await this.esClient.delete({
      index: ANONYMIZATION_PROFILES_INDEX,
      id: profileId,
      refresh: 'wait_for',
    });

    return true;
  }

  /**
   * Finds profiles within a namespace with optional filtering, sorting, and pagination.
   */
  async find(params: FindProfilesParams): Promise<FindProfilesResult> {
    const { namespace, filter, targetType, targetId, page = 1, perPage = 20 } = params;
    const sortField = params.sortField ?? 'created_at';
    const sortOrder = params.sortOrder ?? 'desc';

    const must: Array<Record<string, unknown>> = [{ term: { namespace } }];

    if (targetType) {
      must.push({ term: { target_type: targetType } });
    }
    if (targetId) {
      must.push({ term: { target_id: targetId } });
    }
    if (filter) {
      must.push({
        multi_match: {
          query: filter,
          fields: ['name', 'description'],
        },
      });
    }

    const sortKey = sortField === 'name' ? 'name.keyword' : sortField;

    const result = await this.esClient.search<EsProfileDocument>({
      index: ANONYMIZATION_PROFILES_INDEX,
      query: { bool: { must } },
      sort: [{ [sortKey]: { order: sortOrder } }],
      from: (page - 1) * perPage,
      size: perPage,
    });

    const total =
      typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value ?? 0;

    const data = result.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is EsProfileDocument => doc !== undefined)
      .map((doc) => this.toProfile(doc));

    return { page, perPage, total, data };
  }

  /**
   * Finds a profile by target within a namespace.
   */
  async findByTarget(
    namespace: string,
    targetType: string,
    targetId: string
  ): Promise<AnonymizationProfile | null> {
    const result = await this.find({
      namespace,
      targetType,
      targetId,
      page: 1,
      perPage: 1,
    });

    return result.data[0] ?? null;
  }

  /**
   * Converts an ES document to the public AnonymizationProfile type.
   */
  private toProfile(doc: EsProfileDocument): AnonymizationProfile {
    return {
      id: doc.id,
      name: doc.name,
      description: doc.description,
      targetType: doc.target_type as 'data_view' | 'index_pattern' | 'index',
      targetId: doc.target_id,
      rules: {
        fieldRules: doc.rules.field_rules.map((r) => ({
          field: r.field,
          allowed: r.allowed,
          anonymized: r.anonymized,
          entityClass: r.entity_class,
        })),
        regexRules: (doc.rules.regex_rules ?? []).map((r) => ({
          id: r.id,
          type: 'regex' as const,
          entityClass: r.entity_class,
          pattern: r.pattern,
          enabled: r.enabled,
        })),
        nerRules: (doc.rules.ner_rules ?? []).map((r) => ({
          id: r.id,
          type: 'ner' as const,
          modelId: r.model_id,
          allowedEntityClasses: r.allowed_entity_classes,
          enabled: r.enabled,
        })),
      },
      saltId: doc.salt_id,
      namespace: doc.namespace,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      createdBy: doc.created_by,
      updatedBy: doc.updated_by,
    };
  }
}
