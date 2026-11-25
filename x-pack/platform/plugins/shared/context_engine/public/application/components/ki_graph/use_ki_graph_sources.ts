/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type {
  GetKiResponse,
  KiDocument,
  KiDocumentReference,
} from '../../../../common/http_api/knowledge_indicators';
import { KI_LIFECYCLE_STATUSES } from '../../../../common/step_types/ki';
import { getKi } from '../../api/knowledge_indicators';
import { contextEngineQueryKeys } from '../../hooks/query_keys';
import { useKibana } from '../../hooks/use_kibana';
import { readKiGovernance } from '../ki/view/metadata/view_ki_document_helpers';
import { getWriterAgentId } from '../ki/view/metadata/view_ki_writer_helpers';
import type { KiGraphSource } from './ki_graph_source';
import type { KiGraphNodeData } from './types';

const KI_URI_PREFIX = 'ki://';
const CONVERSATION_URI_PREFIX = 'conversation://';
const MEMORY_SESSION_ID_ATTRIBUTE = 'memory.session_id';
const MAX_GRAPH_SOURCES = 5;

export const KI_GRAPH_SOURCES_STALE_TIME_MS = 3 * 60_000;

export const getMemoryIdsFromReferences = (
  references: readonly KiDocumentReference[] | undefined
): string[] => {
  if (references === undefined) {
    return [];
  }
  const ids: string[] = [];
  for (const ref of references) {
    if (ref.relation !== 'derived_from') {
      continue;
    }
    const uri = ref.uri;
    if (uri === undefined || !uri.startsWith(KI_URI_PREFIX)) {
      continue;
    }
    const memoryId = uri.slice(KI_URI_PREFIX.length);
    if (memoryId.length === 0) {
      continue;
    }
    ids.push(memoryId);
    if (ids.length >= MAX_GRAPH_SOURCES) {
      break;
    }
  }
  return ids;
};

const getConversationId = (document: KiDocument): string | undefined => {
  for (const ref of document.references ?? []) {
    const uri = ref.uri;
    if (uri === undefined || !uri.startsWith(CONVERSATION_URI_PREFIX)) {
      continue;
    }
    const conversationId = uri.slice(CONVERSATION_URI_PREFIX.length);
    if (conversationId.length > 0) {
      return conversationId;
    }
  }
  const sessionId = document.attributes?.[MEMORY_SESSION_ID_ATTRIBUTE];
  if (typeof sessionId === 'string' && sessionId.length > 0) {
    return sessionId;
  }
  return undefined;
};

const getRecordedAt = (document: KiDocument): string | undefined => {
  const timestamp = document['@timestamp'];
  if (typeof timestamp === 'string' && timestamp.length > 0) {
    return timestamp;
  }
  const updatedAt = document.updated_at;
  if (typeof updatedAt === 'string' && updatedAt.length > 0) {
    return updatedAt;
  }
  return undefined;
};

const memoryKiToGraphSource = ({ id, document }: GetKiResponse): KiGraphSource => {
  const governance = readKiGovernance(document);
  const agentId =
    governance.createdBy !== undefined
      ? getWriterAgentId(governance.createdBy.metadata)
      : undefined;
  const title = document.title !== undefined && document.title.length > 0 ? document.title : id;
  const conversationId = getConversationId(document);
  const recordedAt = getRecordedAt(document);

  return {
    id,
    title,
    ...(agentId !== undefined ? { agentName: agentId } : {}),
    ...(conversationId !== undefined ? { conversationId } : {}),
    ...(recordedAt !== undefined ? { recordedAt } : {}),
  };
};

interface UseKiGraphSourcesResult {
  sources: readonly KiGraphSource[];
  isLoading: boolean;
}

export const useKiGraphSources = (
  aiIndexId: string,
  node: KiGraphNodeData | undefined
): UseKiGraphSourcesResult => {
  const {
    services: { http },
  } = useKibana();

  const index = node?.index ?? '';
  const kiId = node?.kiId ?? '';

  const { data, isLoading } = useQuery<readonly KiGraphSource[], Error>({
    queryKey: contextEngineQueryKeys.aiIndex.kiGraphSources(aiIndexId, index, kiId),
    queryFn: async ({ signal }) => {
      if (node === undefined) {
        return [];
      }
      const nodeKi = await getKi(http, {
        aiIndexId,
        kiId: node.kiId,
        index: node.index,
        lifecycleStatus: [...KI_LIFECYCLE_STATUSES],
        signal,
      });
      const memoryIds = getMemoryIdsFromReferences(nodeKi.document.references);
      if (memoryIds.length === 0) {
        return [];
      }
      const settled = await Promise.allSettled(
        memoryIds.map((memoryId) =>
          getKi(http, {
            aiIndexId,
            kiId: memoryId,
            index: node.index,
            lifecycleStatus: [...KI_LIFECYCLE_STATUSES],
            signal,
          })
        )
      );
      const sources: KiGraphSource[] = [];
      for (const result of settled) {
        if (result.status !== 'fulfilled') {
          continue;
        }
        sources.push(memoryKiToGraphSource(result.value));
      }
      return sources;
    },
    enabled: node !== undefined,
    staleTime: KI_GRAPH_SOURCES_STALE_TIME_MS,
  });

  return {
    sources: data ?? [],
    isLoading: node !== undefined && isLoading,
  };
};
