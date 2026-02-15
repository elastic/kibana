/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ReplacementsSet, TokenSourceEntry } from '@kbn/anonymization-common';
import { ANONYMIZATION_REPLACEMENTS_INDEX } from './replacements_index';

/** ES document shape for replacements. */
interface EsReplacementsDocument {
  id: string;
  scope_type: string;
  scope_id: string;
  profile_id: string;
  token_to_original?: Record<string, string>;
  token_to_original_encrypted?: Record<string, string>;
  token_sources: Array<{
    token: string;
    pointer: string;
    entity_class: string;
    source_type: string;
    source_id: string;
    span_start?: number;
    span_end?: number;
    field?: string;
    field_ref?: string;
    rule_type?: string;
    rule_id?: string;
    first_seen_at?: string;
  }>;
  created_at: string;
  updated_at: string;
  created_by: string;
  namespace: string;
}

interface CreateReplacementsParams {
  scopeType: 'thread' | 'execution';
  scopeId: string;
  profileId: string;
  tokenToOriginal: Record<string, string>;
  tokenSources: TokenSourceEntry[];
  namespace: string;
  createdBy: string;
}

interface UpdateReplacementsParams {
  /** New token→original mappings to merge into the existing set. */
  tokenToOriginal: Record<string, string>;
  /** New token sources to append (deduped). */
  tokenSources: TokenSourceEntry[];
}

/** Maximum number of token source entries per replacements set. */
const MAX_TOKEN_SOURCES = 10000;
const ENCRYPTION_VERSION = 'v1';

/**
 * Repository for CRUD operations on anonymization replacements sets.
 * Owned by the inference plugin.
 */
export class ReplacementsRepository {
  private readonly encryptionKey: string | undefined;

  constructor(
    private readonly esClient: ElasticsearchClient,
    options?: {
      encryptionKey?: string;
    }
  ) {
    this.encryptionKey = options?.encryptionKey;
  }

  private deriveKey(secret: string): Buffer {
    return createHash('sha256').update(secret).digest();
  }

  private encryptValue(secret: string, value: string): string {
    const key = this.deriveKey(secret);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${ENCRYPTION_VERSION}:${iv.toString('base64')}:${authTag.toString(
      'base64'
    )}:${encrypted.toString('base64')}`;
  }

  private decryptValue(secret: string, encryptedValue: string): string {
    const [version, ivB64, authTagB64, payloadB64] = encryptedValue.split(':');
    if (version !== ENCRYPTION_VERSION || !ivB64 || !authTagB64 || !payloadB64) {
      throw new Error('Unsupported encrypted replacements payload format');
    }

    const key = this.deriveKey(secret);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payloadB64, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  private serializeTokenMap(
    tokenToOriginal: Record<string, string>
  ): Pick<EsReplacementsDocument, 'token_to_original' | 'token_to_original_encrypted'> {
    if (!this.encryptionKey) {
      return { token_to_original: tokenToOriginal };
    }

    return {
      token_to_original_encrypted: Object.fromEntries(
        Object.entries(tokenToOriginal).map(([token, original]) => [
          token,
          this.encryptValue(this.encryptionKey as string, original),
        ])
      ),
    };
  }

  private deserializeTokenMap(doc: EsReplacementsDocument): Record<string, string> {
    if (doc.token_to_original_encrypted) {
      if (!this.encryptionKey) {
        throw new Error('Encrypted replacements found but encryption key is not configured');
      }

      return Object.fromEntries(
        Object.entries(doc.token_to_original_encrypted).map(([token, encrypted]) => [
          token,
          this.decryptValue(this.encryptionKey as string, encrypted),
        ])
      );
    }

    return doc.token_to_original ?? {};
  }

  /**
   * Creates a new replacements set.
   */
  async create(params: CreateReplacementsParams): Promise<ReplacementsSet> {
    const now = new Date().toISOString();
    const id = uuidv4();

    const doc: EsReplacementsDocument = {
      id,
      scope_type: params.scopeType,
      scope_id: params.scopeId,
      profile_id: params.profileId,
      ...this.serializeTokenMap(params.tokenToOriginal),
      token_sources: params.tokenSources.slice(0, MAX_TOKEN_SOURCES).map((s) => ({
        token: s.token,
        pointer: s.pointer,
        entity_class: s.entityClass,
        source_type: s.sourceType,
        source_id: s.sourceId,
        span_start: s.spanStart,
        span_end: s.spanEnd,
        field: s.field,
        field_ref: s.fieldRef,
        rule_type: s.ruleType,
        rule_id: s.ruleId,
        first_seen_at: s.firstSeenAt,
      })),
      created_at: now,
      updated_at: now,
      created_by: params.createdBy,
      namespace: params.namespace,
    };

    await this.esClient.index({
      index: ANONYMIZATION_REPLACEMENTS_INDEX,
      id,
      document: doc,
      refresh: 'wait_for',
    });

    return this.toReplacementsSet(doc);
  }

  /**
   * Gets a replacements set by ID within a namespace.
   */
  async get(namespace: string, replacementsId: string): Promise<ReplacementsSet | null> {
    try {
      const result = await this.esClient.get<EsReplacementsDocument>({
        index: ANONYMIZATION_REPLACEMENTS_INDEX,
        id: replacementsId,
      });

      const doc = result._source;
      if (!doc || doc.namespace !== namespace) {
        return null;
      }

      return this.toReplacementsSet(doc);
    } catch (err) {
      if (err?.meta?.statusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Finds a replacements set by scope within a namespace.
   */
  async findByScope(
    namespace: string,
    scopeType: string,
    scopeId: string,
    profileId: string
  ): Promise<ReplacementsSet | null> {
    const result = await this.esClient.search<EsReplacementsDocument>({
      index: ANONYMIZATION_REPLACEMENTS_INDEX,
      query: {
        bool: {
          must: [
            { term: { namespace } },
            { term: { scope_type: scopeType } },
            { term: { scope_id: scopeId } },
            { term: { profile_id: profileId } },
          ],
        },
      },
      size: 1,
    });

    const doc = result.hits.hits[0]?._source;
    return doc ? this.toReplacementsSet(doc) : null;
  }

  /**
   * Gets or creates a replacements set for a scope.
   * If one already exists, returns it. Otherwise creates a new one.
   */
  async getOrCreate(params: CreateReplacementsParams): Promise<ReplacementsSet> {
    const existing = await this.findByScope(
      params.namespace,
      params.scopeType,
      params.scopeId,
      params.profileId
    );

    if (existing) {
      return existing;
    }

    return this.create(params);
  }

  /**
   * Updates an existing replacements set by merging in new mappings and sources.
   * Deduplicates token sources.
   */
  async update(
    namespace: string,
    replacementsId: string,
    params: UpdateReplacementsParams
  ): Promise<ReplacementsSet | null> {
    const existing = await this.get(namespace, replacementsId);
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();

    // Merge token_to_original (new mappings added, existing preserved)
    const mergedTokenToOriginal = {
      ...existing.tokenToOriginal,
      ...params.tokenToOriginal,
    };

    // Deduplicate token_sources
    const existingSourceKeys = new Set(
      existing.tokenSources.map((s) => `${s.sourceType}:${s.sourceId}:${s.pointer}:${s.token}`)
    );

    const newSources = params.tokenSources.filter(
      (s) => !existingSourceKeys.has(`${s.sourceType}:${s.sourceId}:${s.pointer}:${s.token}`)
    );

    const mergedSources = [...existing.tokenSources, ...newSources].slice(0, MAX_TOKEN_SOURCES);

    await this.esClient.update({
      index: ANONYMIZATION_REPLACEMENTS_INDEX,
      id: replacementsId,
      doc: {
        ...this.serializeTokenMap(mergedTokenToOriginal),
        token_sources: mergedSources.map((s) => ({
          token: s.token,
          pointer: s.pointer,
          entity_class: s.entityClass,
          source_type: s.sourceType,
          source_id: s.sourceId,
          span_start: s.spanStart,
          span_end: s.spanEnd,
          field: s.field,
          field_ref: s.fieldRef,
          rule_type: s.ruleType,
          rule_id: s.ruleId,
          first_seen_at: s.firstSeenAt,
        })),
        updated_at: now,
      },
      refresh: 'wait_for',
    });

    return this.get(namespace, replacementsId);
  }

  /**
   * Imports/merges replacements from a source scope into a destination scope.
   *
   * Compatibility checks:
   * - `profile_id` must match between source and destination
   * - `token_to_original` conflicts (same token, different original) are rejected
   */
  async importReplacements(
    namespace: string,
    sourceId: string,
    destinationId: string
  ): Promise<ReplacementsSet> {
    const source = await this.get(namespace, sourceId);
    const destination = await this.get(namespace, destinationId);

    if (!source || !destination) {
      const err = new Error('Source or destination replacements set not found');
      (err as any).statusCode = 404;
      throw err;
    }

    // Check profile compatibility
    if (source.profileId !== destination.profileId) {
      const err = new Error(
        `Cannot import replacements: profile_id mismatch (source: ${source.profileId}, destination: ${destination.profileId})`
      );
      (err as any).statusCode = 409;
      throw err;
    }

    // Check for token_to_original conflicts
    for (const [token, originalValue] of Object.entries(source.tokenToOriginal)) {
      const existingOriginal = destination.tokenToOriginal[token];
      if (existingOriginal !== undefined && existingOriginal !== originalValue) {
        const err = new Error(
          `Cannot import replacements: token_to_original conflict for token "${token}"`
        );
        (err as any).statusCode = 409;
        throw err;
      }
    }

    // Merge
    const result = await this.update(namespace, destinationId, {
      tokenToOriginal: source.tokenToOriginal,
      tokenSources: source.tokenSources,
    });

    return result!;
  }

  /**
   * Converts an ES document to the public ReplacementsSet type.
   */
  private toReplacementsSet(doc: EsReplacementsDocument): ReplacementsSet {
    return {
      id: doc.id,
      scopeType: doc.scope_type as 'thread' | 'execution',
      scopeId: doc.scope_id,
      profileId: doc.profile_id,
      tokenToOriginal: this.deserializeTokenMap(doc),
      tokenSources: (doc.token_sources ?? []).map((s) => ({
        token: s.token,
        pointer: s.pointer,
        entityClass: s.entity_class,
        sourceType: s.source_type,
        sourceId: s.source_id,
        spanStart: s.span_start,
        spanEnd: s.span_end,
        field: s.field,
        fieldRef: s.field_ref,
        ruleType: s.rule_type,
        ruleId: s.rule_id,
        firstSeenAt: s.first_seen_at,
      })),
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      createdBy: doc.created_by,
      namespace: doc.namespace,
    };
  }
}
