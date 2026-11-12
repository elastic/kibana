/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { validateAiIndexId } from '@kbn/context-engine-plugin/common/ai_index_dest';
import type { AiIndexDest } from '@kbn/context-engine-plugin/common/http_api/ai_indices';
import type { KiFields } from '@kbn/context-engine-plugin/common/step_types/ki';
import {
  AiIndexAlreadyExistsError,
  AiIndexConflictError,
  AiIndexNotFoundError,
  KiConflictError,
} from '@kbn/context-engine-plugin/server/ai_indices/errors';
import {
  findKiRevision,
  hardDeleteKiRevision,
  putKiRevision,
  type StoredKi,
} from '@kbn/context-engine-plugin/server/ai_indices/ki_revision';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { SUMMARY_KINDS, type SummaryKind } from '../common/constants';
import type { Summary } from './summarize';
import type { SourceFile } from './sources';

const WRITER = { uri: 'tool://connector-memory', metadata: {} };
const MAX_RETRIES = 2;
const MAX_PRINCIPALS = 100;

export type Permission = { scope: 'connector' } | { scope: 'per_user'; profileUid: string };

/** What a cached file records about the source file it was made from. */
export interface CachedFile {
  modifiedAt?: string;
  size?: number;
  kind: SummaryKind;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const list = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === 'string'
  );
const rank = (kind: unknown): number => Math.max(0, SUMMARY_KINDS.indexOf(kind as SummaryKind));
const hash = (...parts: string[]) =>
  createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 32);

/** The same file always has the same id, whoever reads it and however it was found. */
export const fileKiId = (connectorId: string, fileId: string): string =>
  `cm-doc-${hash(connectorId, fileId)}`;
const settingsKiId = (connectorId: string): string => `cm-settings-${hash(connectorId)}`;

const kiFields = ({
  connectorId,
  connectorType,
  file,
  summary,
  permission,
  expiresAt,
}: {
  connectorId: string;
  connectorType: string;
  file: SourceFile;
  summary?: Summary;
  permission: Permission;
  expiresAt: string;
}): KiFields => {
  const kind: SummaryKind = summary?.kind ?? 'names';
  const details = [
    file.mimeType,
    file.size !== undefined ? `${file.size} bytes` : undefined,
    file.modifiedAt && `modified ${file.modifiedAt.slice(0, 10)}`,
  ]
    .filter(Boolean)
    .join(', ');
  const content = [
    `Source: ${file.url}`,
    `Name: ${file.name}${details ? ` (${details})` : ''}`,
    ...(summary
      ? [
          '',
          summary.summary,
          ...(summary.keyPoints.length > 0
            ? ['', 'Key points:', ...summary.keyPoints.map((p) => `- ${p}`)]
            : []),
          ...(summary.questions.length > 0
            ? ['', 'Answers:', ...summary.questions.map((q) => `- ${q}`)]
            : []),
        ]
      : []),
  ].join('\n');
  return {
    type: 'document',
    title: file.name,
    description:
      summary?.summary.slice(0, 300) ??
      `${file.name}${details ? ` (${details})` : ''}, read through connector ${connectorId}.`,
    content,
    tags: [`connector:${connectorId}`, `connector_type:${connectorType}`],
    attributes: {
      connector_id: connectorId,
      permission_scope: permission.scope,
      document_id: file.id,
      document_url: file.url,
      summary_kind: kind,
      ...(file.modifiedAt !== undefined && { source_modified: file.modifiedAt }),
      ...(file.size !== undefined && { size_bytes: file.size }),
      ...(permission.scope === 'per_user' && { visible_to: [permission.profileUid] }),
    },
    references: [
      {
        uri: `connector://${connectorId}/${file.id}`,
        relation: 'derived_from',
        description: `Source ${file.url}`,
      },
    ],
    expires_at: expiresAt,
  } as KiFields;
};

/**
 * Everything memory keeps in its AI index: the cached files (one KI per source file, readable by lookup), the settings
 * of each connector, and the index's own place in Context Engine (its sources). Writes are as the calling user.
 */
export class MemoryStore {
  private readonly dests = new Map<string, AiIndexDest>();
  private readonly listedSources = new Set<string>();

  constructor(
    private readonly deps: {
      getAiIndexService: () => AiIndexService;
      aiIndexId: string;
      ttlDays: number;
      logger: Logger;
      now?: () => Date;
    }
  ) {}

  private now(): Date {
    return this.deps.now?.() ?? new Date();
  }

  /** The index's backing target in a space, or undefined when nothing was cached there yet. */
  async target(spaceId: string): Promise<string | undefined> {
    return (await this.dest(spaceId, false))?.value;
  }

  /** Creates the AI index when there is none: an ordinary index named from its id. */
  private async dest(spaceId: string, create: boolean): Promise<AiIndexDest | undefined> {
    const cached = this.dests.get(spaceId);
    if (cached) {
      return cached;
    }
    const { aiIndexId } = this.deps;
    const service = this.deps.getAiIndexService();
    let dest: AiIndexDest | undefined;
    try {
      dest = (await service.get(aiIndexId, spaceId)).dest;
    } catch (error) {
      if (!(error instanceof AiIndexNotFoundError)) {
        throw error;
      }
    }
    if (dest === undefined && create) {
      const valid = validateAiIndexId('index', aiIndexId);
      if (valid.dest === undefined) {
        throw new Error(`Cannot create AI index '${aiIndexId}': ${valid.error}`);
      }
      dest = valid.dest;
      await service
        .create(aiIndexId, spaceId, { dest, automations: [], sources: [], traces: [] })
        .catch((error) => {
          if (!(error instanceof AiIndexAlreadyExistsError)) {
            throw error;
          }
        });
    }
    if (dest !== undefined) {
      this.dests.set(spaceId, dest);
    }
    return dest;
  }

  /**
   * Lists the connectors, and the index's own data, as sources of the index, so the Context page shows where its
   * knowledge comes from. Never fails the caller: it is a courtesy to the page.
   */
  async listAsSources(spaceId: string, connectorIds: string[]): Promise<void> {
    const fresh = connectorIds.filter((id) => !this.listedSources.has(`${spaceId}\0${id}`));
    if (fresh.length === 0) {
      return;
    }
    try {
      await this.dest(spaceId, true);
      await this.changeIndex(spaceId, (index) => {
        const own = { type: 'esql' as const, value: `FROM ${index.dest.value}` };
        const add = [
          ...(index.sources.some(({ value }) => value === own.value) ? [] : [own]),
          ...fresh
            .filter(
              (id) => !index.sources.some(({ type, value }) => type === 'connector' && value === id)
            )
            .map((value) => ({ type: 'connector' as const, value })),
        ];
        return add.length > 0 ? { sources: [...index.sources, ...add] } : undefined;
      });
      fresh.forEach((id) => this.listedSources.add(`${spaceId}\0${id}`));
    } catch (error) {
      this.deps.logger.warn(
        `Could not list connectors as sources of '${this.deps.aiIndexId}': ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  /**
   * Replaces the AI index with itself plus a change, retrying a concurrent write. The index is replaced whole, so
   * everything the change does not touch is passed back as it was.
   */
  private async changeIndex(
    spaceId: string,
    change: (index: Awaited<ReturnType<AiIndexService['get']>>) =>
      | {
          sources?: Array<{ type: 'esql' | 'connector'; value: string }>;
          automations?: Array<{ type: 'workflow'; value: string }>;
        }
      | undefined
  ): Promise<void> {
    const { aiIndexId } = this.deps;
    const service = this.deps.getAiIndexService();
    for (let attempt = 0; ; attempt++) {
      const index = await service.get(aiIndexId, spaceId);
      const changed = change(index);
      if (changed === undefined) {
        return;
      }
      try {
        await service.put(aiIndexId, spaceId, {
          ...(index.description !== undefined && { description: index.description }),
          memory_enabled: index.memory_enabled,
          dest: index.dest,
          automations: changed.automations ?? index.automations,
          sources: changed.sources ?? index.sources,
          traces: index.traces.map(({ type, value }) => ({ type, value })),
          ...(index.feedback_analysis !== undefined && {
            feedback_analysis: index.feedback_analysis,
          }),
        });
        return;
      } catch (error) {
        if (!(error instanceof AiIndexConflictError) || attempt >= MAX_RETRIES) {
          throw error;
        }
      }
    }
  }

  /** The ids of the workflows attached to the index as automations. */
  async automations(spaceId: string): Promise<string[]> {
    const index = await this.deps
      .getAiIndexService()
      .get(this.deps.aiIndexId, spaceId)
      .catch(() => undefined);
    return (index?.automations ?? [])
      .filter(({ type }) => type === 'workflow')
      .map(({ value }) => value);
  }

  /** Attaches a workflow to the index as an automation (once), so the Context page shows it. */
  async attachAutomation(spaceId: string, workflowId: string): Promise<void> {
    await this.dest(spaceId, true);
    await this.deps
      .getAiIndexService()
      .addAutomation(this.deps.aiIndexId, spaceId, { type: 'workflow', value: workflowId });
  }

  /** The index without the workflow as an automation. */
  async detachAutomation(spaceId: string, workflowId: string): Promise<void> {
    await this.changeIndex(spaceId, ({ automations }) => ({
      automations: automations.filter(({ value }) => value !== workflowId),
    }));
  }

  /** What is already cached for these files, to leave the unchanged ones alone. */
  async cached(
    esClient: ElasticsearchClient,
    spaceId: string,
    connectorId: string,
    fileIds: string[]
  ): Promise<Map<string, CachedFile>> {
    const found = new Map<string, CachedFile>();
    const dest = fileIds.length > 0 ? await this.dest(spaceId, false) : undefined;
    if (dest === undefined) {
      return found;
    }
    const ids = fileIds.map((id) => fileKiId(connectorId, id));
    const response = await esClient.mget<{ attributes?: Record<string, unknown> }>({
      index: dest.value,
      ids,
      _source_includes: ['attributes'],
    });
    response.docs.forEach((doc, at) => {
      const attributes = 'found' in doc && doc.found ? doc._source?.attributes : undefined;
      if (isRecord(attributes)) {
        found.set(fileIds[at], {
          kind: SUMMARY_KINDS.includes(attributes.summary_kind as SummaryKind)
            ? (attributes.summary_kind as SummaryKind)
            : 'names',
          ...(typeof attributes.source_modified === 'string' && {
            modifiedAt: attributes.source_modified,
          }),
          ...(attributes.size_bytes !== undefined && { size: Number(attributes.size_bytes) }),
        });
      }
    });
    return found;
  }

  /**
   * Writes one file. A file already cached is only rewritten when this is a better record of it (a model summary over an
   * excerpt over a name) or the file changed without getting worse; otherwise it only gains the reader.
   * Returns whether anything was written.
   */
  async remember(params: {
    esClient: ElasticsearchClient;
    spaceId: string;
    connectorId: string;
    connectorType: string;
    file: SourceFile;
    summary?: Summary;
    permission: Permission;
  }): Promise<boolean> {
    const { esClient, spaceId, connectorId, connectorType, file, summary, permission } = params;
    const expiresAt = new Date(this.now().getTime() + this.deps.ttlDays * 86_400_000).toISOString();
    const fresh = kiFields({ connectorId, connectorType, file, summary, permission, expiresAt });
    return this.update(esClient, spaceId, fileKiId(connectorId, file.id), (stored) => {
      if (!stored) {
        return { fields: fresh };
      }
      const attributes = isRecord(stored.attributes) ? stored.attributes : {};
      const principals = list(attributes.visible_to);
      const changed =
        attributes.source_modified !== file.modifiedAt || attributes.size_bytes !== file.size;
      const newRank = rank(summary?.kind ?? 'names');
      const better =
        newRank > rank(attributes.summary_kind) ||
        (changed && newRank >= rank(attributes.summary_kind));
      const gains = permission.scope === 'per_user' && !principals.includes(permission.profileUid);
      if (!better && !gains) {
        return undefined;
      }
      const visibleTo =
        permission.scope === 'per_user'
          ? [...new Set([...principals, permission.profileUid])].slice(-MAX_PRINCIPALS)
          : undefined;
      return {
        fields: better ? fresh : (stored as unknown as KiFields),
        attributes: {
          ...(better ? fresh.attributes : attributes),
          ...(visibleTo && { visible_to: visibleTo }),
        },
      };
    });
  }

  /** Adds the user to a cached file they proved access to, or removes them (and the file, when nobody is left). */
  async setPrincipal(params: {
    esClient: ElasticsearchClient;
    spaceId: string;
    kiId: string;
    principal: string;
    action: 'add' | 'remove';
  }): Promise<void> {
    const { esClient, spaceId, kiId, principal, action } = params;
    await this.update(esClient, spaceId, kiId, (stored) => {
      const attributes = isRecord(stored?.attributes) ? stored.attributes : {};
      const current = list(attributes.visible_to).filter(Boolean);
      // A file with no list is public to the space and is left alone.
      if (!stored || current.length === 0) {
        return undefined;
      }
      const next =
        action === 'add'
          ? [...new Set([...current, principal])].slice(-MAX_PRINCIPALS)
          : current.filter((p) => p !== principal);
      if (next.length === current.length && next.every((p, i) => p === current[i])) {
        return undefined;
      }
      return next.length === 0
        ? 'delete'
        : {
            fields: stored as unknown as KiFields,
            attributes: { ...attributes, visible_to: next },
          };
    });
  }

  /** What an admin saved for a connector (a JSON record), if anything. */
  async getSettings(
    esClient: ElasticsearchClient,
    spaceId: string,
    connectorId: string
  ): Promise<unknown> {
    const dest = await this.dest(spaceId, false);
    if (dest === undefined) {
      return undefined;
    }
    const response = await esClient.get<{ attributes?: Record<string, unknown> }>(
      { index: dest.value, id: settingsKiId(connectorId), _source_includes: ['attributes'] },
      { ignore: [404] }
    );
    const raw = response.found ? response._source?.attributes?.settings_json : undefined;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  }

  async putSettings(
    esClient: ElasticsearchClient,
    spaceId: string,
    connectorId: string,
    settings: unknown
  ): Promise<void> {
    const json = JSON.stringify(settings);
    const written = await this.update(esClient, spaceId, settingsKiId(connectorId), () => ({
      fields: {
        type: 'index_metadata',
        title: `Connector memory settings for ${connectorId}`,
        description: 'Per-connector choices for what connector memory learns. Not content.',
        content: json,
        tags: ['connector_memory', 'settings'],
        attributes: { kind: 'settings', settings_for: connectorId, settings_json: json },
        references: [],
      } as KiFields,
    }));
    if (!written) {
      throw new Error('The settings could not be saved.');
    }
  }

  async removeSettings(
    esClient: ElasticsearchClient,
    spaceId: string,
    connectorId: string
  ): Promise<void> {
    const dest = await this.dest(spaceId, false);
    if (dest !== undefined) {
      await esClient.delete(
        { index: dest.value, id: settingsKiId(connectorId), refresh: 'wait_for' },
        { ignore: [404] }
      );
    }
  }

  /**
   * One optimistic read-modify-write of a KI: `change` sees the stored KI and returns what to write (its fields, and
   * attributes to replace them with), 'delete', or undefined to leave it. A concurrent write is retried from a fresh read.
   */
  private async update(
    esClient: ElasticsearchClient,
    spaceId: string,
    kiId: string,
    change: (
      stored: StoredKi | undefined
    ) => { fields: KiFields; attributes?: Record<string, unknown> } | 'delete' | undefined
  ): Promise<boolean> {
    const { aiIndexId } = this.deps;
    const dest = await this.dest(spaceId, true);
    if (dest === undefined) {
      return false;
    }
    for (let attempt = 0; ; attempt++) {
      const revision = await findKiRevision({
        esClient,
        aiIndexId,
        dest,
        kiId,
        includeSource: true,
      });
      const stored = revision?.source;
      const outcome = change(stored);
      if (outcome === undefined) {
        return false;
      }
      if (outcome === 'delete') {
        if (revision) {
          await hardDeleteKiRevision({ esClient, aiIndexId, kiId, revision });
        }
        return true;
      }
      const timestamp = this.now().toISOString();
      const created = stored?.governance?.provenance?.created_by ?? WRITER;
      try {
        await putKiRevision({
          esClient,
          aiIndexId,
          dest,
          kiId,
          document: {
            '@timestamp':
              typeof stored?.['@timestamp'] === 'string' ? stored['@timestamp'] : timestamp,
            ...outcome.fields,
            ...(outcome.attributes && { attributes: outcome.attributes }),
            id: kiId,
            updated_at: timestamp,
            governance: { provenance: { created_by: created, updated_by: WRITER } },
          } as StoredKi,
          existing: revision && {
            index: revision.index,
            documentId: revision.documentId,
            seqNo: revision.seqNo,
            primaryTerm: revision.primaryTerm,
          },
          failIfExists: revision === undefined,
        });
        return true;
      } catch (error) {
        if (!(error instanceof KiConflictError) || attempt >= MAX_RETRIES) {
          throw error;
        }
        // The re-read is a search, which cannot see a document written moments ago.
        await esClient.indices.refresh({ index: dest.value }).catch(() => undefined);
      }
    }
  }
}
