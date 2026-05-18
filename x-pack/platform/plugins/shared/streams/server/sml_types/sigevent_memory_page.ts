/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { SmlTypeDefinition } from '@kbn/agent-context-layer-plugin/server';
import {
  AttachmentType,
  type SigeventMemoryPageAttachmentData,
} from '@kbn/agent-builder-common/attachments';
import { OBSERVABILITY_STREAMS_ENABLE_MEMORY } from '@kbn/management-settings-ids';
import { MemoryServiceImpl } from '../lib/memory';
import type { StreamsPluginStartDependencies } from '../types';

export const SIGEVENT_MEMORY_PAGE_SML_TYPE = 'sigevent_memory_page';

interface SigeventMemoryPageSmlTypeDeps {
  getStartServices: CoreSetup<StreamsPluginStartDependencies>['getStartServices'];
}

const buildIsMemoryEnabled =
  (getStartServices: CoreSetup<StreamsPluginStartDependencies>['getStartServices']) =>
  async (): Promise<boolean> => {
    try {
      const [coreStart] = await getStartServices();
      const soClient = coreStart.savedObjects.createInternalRepository();
      const uiSettings = coreStart.uiSettings.asScopedToClient(soClient);
      return await uiSettings.get<boolean>(OBSERVABILITY_STREAMS_ENABLE_MEMORY);
    } catch {
      return false;
    }
  };

export const createSigeventMemoryPageSmlType = (
  deps: SigeventMemoryPageSmlTypeDeps
): SmlTypeDefinition => {
  const { getStartServices } = deps;
  const isMemoryEnabled = buildIsMemoryEnabled(getStartServices);

  return {
    id: SIGEVENT_MEMORY_PAGE_SML_TYPE,

    fetchFrequency: () => '5m',

    list: (context) => ({
      async *[Symbol.asyncIterator]() {
        if (!(await isMemoryEnabled())) {
          return;
        }

        const memory = new MemoryServiceImpl({
          logger: context.logger.get('sml-sigevent-memory'),
          esClient: context.esClient,
        });

        const entries = await memory.listAll();
        if (entries.length > 0) {
          yield entries.map((entry) => ({
            id: entry.id,
            updatedAt: entry.updated_at,
            spaces: ['*'],
          }));
        }
      },
    }),

    getSmlData: async (originId, context) => {
      if (!(await isMemoryEnabled())) {
        return undefined;
      }

      try {
        const memory = new MemoryServiceImpl({
          logger: context.logger.get('sml-sigevent-memory'),
          esClient: context.esClient,
        });

        const entry = await memory.get({ id: originId });

        const descriptionParts: string[] = [];
        if (entry.categories.length > 0) {
          descriptionParts.push(`Categories: ${entry.categories.join(', ')}`);
        }
        if (entry.tags.length > 0) {
          descriptionParts.push(`Tags: ${entry.tags.join(', ')}`);
        }

        return {
          chunks: [
            {
              type: SIGEVENT_MEMORY_PAGE_SML_TYPE,
              title: entry.title,
              content: entry.content,
              description: descriptionParts.length > 0 ? descriptionParts.join(' | ') : undefined,
            },
          ],
        };
      } catch (error) {
        context.logger.warn(
          `SML sigevent_memory_page: failed to get data for '${originId}': ${
            (error as Error).message
          }`
        );
        return undefined;
      }
    },

    toAttachment: async (item) => {
      const data: SigeventMemoryPageAttachmentData = {
        memory_page_id: item.origin_id,
        memory_page_name: item.title,
        memory_page_title: item.title,
      };

      return {
        type: AttachmentType.sigeventMemoryPage,
        data,
      };
    },
  };
};
