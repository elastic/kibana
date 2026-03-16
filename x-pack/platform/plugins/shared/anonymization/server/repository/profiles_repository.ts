/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  AnonymizationProfile,
  AnonymizationProfileRules,
  AnonymizationEntityClass,
  NerEntityClass,
  FindAnonymizationProfilesQuery,
} from '@kbn/anonymization-common';
import { ANONYMIZATION_PROFILES_INDEX } from '../../common';

/** Shape of an ES document in the profiles index. */
interface EsProfileDocument {
  id: string;
  name: string;
  description?: string;
  target_type: ProfileTargetType;
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
      type: 'regex';
      entity_class: string;
      pattern: string;
      enabled: boolean;
    }>;
    ner_rules: Array<{
      id: string;
      type: 'ner';
      model_id?: string;
      allowed_entity_classes: string[];
      enabled: boolean;
    }>;
  };
  namespace: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

type ProfileTargetType = AnonymizationProfile['targetType'];
type EsFieldRuleDocument = EsProfileDocument['rules']['field_rules'][number];
type EsRegexRuleDocument = EsProfileDocument['rules']['regex_rules'][number];
type EsNerRuleDocument = EsProfileDocument['rules']['ner_rules'][number];

interface CreateProfileParams {
  name: string;
  description?: string;
  targetType: ProfileTargetType;
  targetId: string;
  rules: AnonymizationProfileRules;
  namespace: string;
  createdBy: string;
}

interface UpdateProfileParams {
  name?: string;
  description?: string;
  rules?: {
    fieldRules: CreateProfileParams['rules']['fieldRules'];
    regexRules?: CreateProfileParams['rules']['regexRules'];
    nerRules?: CreateProfileParams['rules']['nerRules'];
  };
  updatedBy: string;
}

interface FindProfilesParams {
  namespace: string;
  filter?: FindAnonymizationProfilesQuery['filter'];
  targetType?: FindAnonymizationProfilesQuery['target_type'];
  targetId?: FindAnonymizationProfilesQuery['target_id'];
  sortField?: FindAnonymizationProfilesQuery['sort_field'];
  sortOrder?: FindAnonymizationProfilesQuery['sort_order'];
  page?: FindAnonymizationProfilesQuery['page'];
  perPage?: FindAnonymizationProfilesQuery['per_page'];
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

  private getSaltId(namespace: string): string {
    return `salt-${namespace}`;
  }

  private buildProfileId(namespace: string, targetType: string, targetId: string): string {
    const tuple = `${namespace}:${targetType}:${targetId}`;
    const digest = createHash('sha256').update(tuple).digest('hex');
    return `profile-${digest}`;
  }

  private isConflictError(err: unknown): boolean {
    const statusCode = (err as { statusCode?: number; meta?: { statusCode?: number } })?.statusCode;
    const metaStatusCode = (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
    return statusCode === 409 || metaStatusCode === 409;
  }

  private rulesToEsDoc(rules: AnonymizationProfileRules): EsProfileDocument['rules'] {
    return {
      field_rules: rules.fieldRules.map<EsFieldRuleDocument>((r) => ({
        field: r.field,
        allowed: r.allowed,
        anonymized: r.anonymized,
        entity_class: r.entityClass,
      })),
      regex_rules: (rules.regexRules ?? []).map<EsRegexRuleDocument>((r) => ({
        id: r.id,
        type: r.type,
        entity_class: r.entityClass,
        pattern: r.pattern,
        enabled: r.enabled,
      })),
      ner_rules: (rules.nerRules ?? []).map<EsNerRuleDocument>((r) => ({
        id: r.id,
        type: r.type,
        model_id: r.modelId,
        allowed_entity_classes: r.allowedEntityClasses,
        enabled: r.enabled,
      })),
    };
  }

  /**
   * Creates a new profile. Enforces uniqueness per (namespace, target_type, target_id).
   * @throws ConflictError if a profile for the same target already exists in the space.
   */
  async create(params: CreateProfileParams): Promise<AnonymizationProfile> {
    const now = new Date().toISOString();
    const id = this.buildProfileId(params.namespace, params.targetType, params.targetId);

    const doc: EsProfileDocument = {
      id,
      name: params.name,
      description: params.description,
      target_type: params.targetType,
      target_id: params.targetId,
      rules: this.rulesToEsDoc(params.rules),
      namespace: params.namespace,
      created_at: now,
      updated_at: now,
      created_by: params.createdBy,
      updated_by: params.createdBy,
    };

    try {
      await this.esClient.index({
        index: ANONYMIZATION_PROFILES_INDEX,
        id,
        op_type: 'create',
        document: doc,
        refresh: 'wait_for',
      });
    } catch (err) {
      if (this.isConflictError(err)) {
        const conflictError = new Error(
          `A profile already exists for target (${params.targetType}, ${params.targetId}) in space ${params.namespace}`
        );
        (conflictError as { statusCode?: number }).statusCode = 409;
        throw conflictError;
      }
      throw err;
    }

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
    let getResult: { _source?: EsProfileDocument; _seq_no?: number; _primary_term?: number };
    try {
      getResult = await this.esClient.get<EsProfileDocument>({
        index: ANONYMIZATION_PROFILES_INDEX,
        id: profileId,
      });
    } catch (err) {
      if (err?.meta?.statusCode === 404) {
        return null;
      }
      throw err;
    }

    const existing = getResult._source;
    if (!existing || existing.namespace !== namespace) {
      return null;
    }

    const existingProfile = this.toProfile(existing);
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
      updateDoc.rules = this.rulesToEsDoc({
        fieldRules: params.rules.fieldRules,
        regexRules: params.rules.regexRules ?? existingProfile.rules.regexRules ?? [],
        nerRules: params.rules.nerRules ?? existingProfile.rules.nerRules ?? [],
      });
    }

    await this.esClient.update({
      index: ANONYMIZATION_PROFILES_INDEX,
      id: profileId,
      if_seq_no: getResult._seq_no,
      if_primary_term: getResult._primary_term,
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

    try {
      await this.esClient.delete({
        index: ANONYMIZATION_PROFILES_INDEX,
        id: profileId,
        refresh: 'wait_for',
      });
    } catch (err) {
      if (err?.meta?.statusCode === 404) {
        return true;
      }
      throw err;
    }

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
    if (filter?.trim()) {
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
    targetType: ProfileTargetType,
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
      targetType: doc.target_type as ProfileTargetType,
      targetId: doc.target_id,
      rules: {
        fieldRules: (doc.rules.field_rules ?? []).map((r) => ({
          field: r.field,
          allowed: r.allowed,
          anonymized: r.anonymized,
          entityClass: r.entity_class as AnonymizationEntityClass | undefined,
        })),
        regexRules: (doc.rules.regex_rules ?? []).map((r) => ({
          id: r.id,
          type: 'regex' as const,
          entityClass: r.entity_class as AnonymizationEntityClass,
          pattern: r.pattern,
          enabled: r.enabled,
        })),
        nerRules: (doc.rules.ner_rules ?? []).map((r) => ({
          id: r.id,
          type: 'ner' as const,
          modelId: r.model_id,
          allowedEntityClasses: r.allowed_entity_classes as NerEntityClass[],
          enabled: r.enabled,
        })),
      },
      saltId: this.getSaltId(doc.namespace),
      namespace: doc.namespace,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      createdBy: doc.created_by,
      updatedBy: doc.updated_by,
    };
  }
}
