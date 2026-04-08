/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ReplacementsSet } from '@kbn/anonymization-common';
import { ANONYMIZATION_REPLACEMENTS_INDEX } from './replacements_index';

/** ES document shape for replacements. */
interface EsReplacementsDocument {
  id: string;
  replacements: Array<{
    anonymized: string;
    original?: string;
    original_encrypted?: string;
  }>;
  created_at: string;
  updated_at: string;
  created_by: string;
  namespace: string;
}

interface CreateReplacementsParams {
  id?: string;
  replacements: Array<{
    anonymized: string;
    original: string;
  }>;
  namespace: string;
  createdBy: string;
}

interface UpdateReplacementsParams {
  /** New replacements to merge into the existing set. */
  replacements: Array<{
    anonymized: string;
    original: string;
  }>;
}

/** Maximum number of replacement entries per replacements set. */
const MAX_REPLACEMENTS = 10000;
const MAX_UPDATE_RETRIES = 3;
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

  private serializeOriginal(
    original: string
  ): Pick<EsReplacementsDocument['replacements'][number], 'original' | 'original_encrypted'> {
    if (!this.encryptionKey) {
      return { original };
    }

    return {
      original_encrypted: this.encryptValue(this.encryptionKey as string, original),
    };
  }

  private deserializeOriginal(replacement: EsReplacementsDocument['replacements'][number]): string {
    if (replacement.original_encrypted) {
      if (!this.encryptionKey) {
        throw new Error('Encrypted replacements found but encryption key is not configured');
      }
      return this.decryptValue(this.encryptionKey as string, replacement.original_encrypted);
    }

    if (replacement.original !== undefined) {
      return replacement.original;
    }

    throw new Error(
      `Invalid replacements entry for token "${replacement.anonymized}": missing original payload`
    );
  }

  private setStatusCode(error: Error, statusCode: number): Error & { statusCode: number } {
    const withStatus = error as Error & { statusCode: number };
    withStatus.statusCode = statusCode;
    return withStatus;
  }

  private isVersionConflict(err: unknown): boolean {
    const statusCode = (err as { statusCode?: number; meta?: { statusCode?: number } })?.statusCode;
    const metaStatusCode = (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
    return statusCode === 409 || metaStatusCode === 409;
  }

  private dedupeAndValidate(
    replacements: Array<{ anonymized: string; original: string }>
  ): Array<{ anonymized: string; original: string }> {
    const byToken = new Map<string, string>();

    for (const replacement of replacements) {
      const existing = byToken.get(replacement.anonymized);
      if (existing !== undefined && existing !== replacement.original) {
        throw this.setStatusCode(
          new Error(
            `Cannot store replacements: anonymized token "${replacement.anonymized}" maps to multiple originals`
          ),
          409
        );
      }
      byToken.set(replacement.anonymized, replacement.original);
    }

    return [...byToken.entries()].map(([anonymized, original]) => ({
      anonymized,
      original,
    }));
  }

  toTokenToOriginalMap(replacements: ReplacementsSet): Record<string, string> {
    return Object.fromEntries(
      replacements.replacements.map((replacement) => [replacement.anonymized, replacement.original])
    );
  }

  /**
   * Creates a new replacements set.
   */
  async create(params: CreateReplacementsParams): Promise<ReplacementsSet> {
    const now = new Date().toISOString();
    const id = params.id ?? uuidv4();
    const replacements = this.dedupeAndValidate(params.replacements).slice(0, MAX_REPLACEMENTS);

    const doc: EsReplacementsDocument = {
      id,
      replacements: replacements.map((replacement) => ({
        anonymized: replacement.anonymized,
        ...this.serializeOriginal(replacement.original),
      })),
      created_at: now,
      updated_at: now,
      created_by: params.createdBy,
      namespace: params.namespace,
    };

    await this.esClient.index({
      index: ANONYMIZATION_REPLACEMENTS_INDEX,
      id,
      op_type: 'create',
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
   * Updates an existing replacements set by merging in new replacement mappings.
   * Deduplicates by anonymized token and rejects conflicting mappings.
   */
  async update(
    namespace: string,
    replacementsId: string,
    params: UpdateReplacementsParams
  ): Promise<ReplacementsSet | null> {
    for (let attempt = 0; attempt < MAX_UPDATE_RETRIES; attempt++) {
      let docResult: {
        _source?: EsReplacementsDocument;
        _seq_no?: number;
        _primary_term?: number;
      };
      try {
        docResult = await this.esClient.get<EsReplacementsDocument>({
          index: ANONYMIZATION_REPLACEMENTS_INDEX,
          id: replacementsId,
        });
      } catch (err) {
        if ((err as { meta?: { statusCode?: number } })?.meta?.statusCode === 404) {
          return null;
        }
        throw err;
      }

      const doc = docResult._source;
      if (!doc || doc.namespace !== namespace) {
        return null;
      }

      const existing = this.toReplacementsSet(doc);
      const now = new Date().toISOString();
      const mergedReplacements = this.dedupeAndValidate([
        ...existing.replacements,
        ...params.replacements,
      ]).slice(0, MAX_REPLACEMENTS);

      try {
        await this.esClient.update({
          index: ANONYMIZATION_REPLACEMENTS_INDEX,
          id: replacementsId,
          if_seq_no: docResult._seq_no,
          if_primary_term: docResult._primary_term,
          doc: {
            replacements: mergedReplacements.map((replacement) => ({
              anonymized: replacement.anonymized,
              ...this.serializeOriginal(replacement.original),
            })),
            updated_at: now,
          },
          refresh: 'wait_for',
        });

        return this.get(namespace, replacementsId);
      } catch (err) {
        if (this.isVersionConflict(err) && attempt < MAX_UPDATE_RETRIES - 1) {
          continue;
        }
        throw err;
      }
    }

    throw this.setStatusCode(
      new Error('Failed to update replacements due to repeated conflicts'),
      409
    );
  }

  /**
   * Converts an ES document to the public ReplacementsSet type.
   */
  private toReplacementsSet(doc: EsReplacementsDocument): ReplacementsSet {
    const replacements = (doc.replacements ?? []).map((replacement) => ({
      anonymized: replacement.anonymized,
      original: this.deserializeOriginal(replacement),
    }));

    return {
      id: doc.id,
      namespace: doc.namespace,
      replacements,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      createdBy: doc.created_by,
    };
  }
}
