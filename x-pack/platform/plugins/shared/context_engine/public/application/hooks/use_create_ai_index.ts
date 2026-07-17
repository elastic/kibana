/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { useCallback, useState } from 'react';
import {
  AI_INDEX_API_VERSION,
  DEFAULT_AI_INDEX_DATA_STREAM,
  DEFAULT_AI_INDEX_NAME,
  aiIndexByIdPath,
} from '../../../common/constants';
import type {
  AiIndexProperties,
  AiIndexSource,
  PutAiIndexResponse,
} from '../../../common/http_api/ai_indices';
import type { SelectedSource } from '../components/source_picker';
import { useKibana } from './use_kibana';

interface CreatedAiIndex {
  id: string;
}

/**
 * Builds the AI index payload using a fixed identity while the create page has
 * no dedicated form. The `dest` points at the data stream created from Dev
 * Console via the "Create AI index dest" button, so the two always match. The
 * fixed id means repeated creates upsert the same record.
 */
const buildAiIndexProperties = (sources: AiIndexSource[]): { id: string } & AiIndexProperties => ({
  id: DEFAULT_AI_INDEX_NAME,
  name: DEFAULT_AI_INDEX_NAME,
  dest: { type: 'data_stream', value: DEFAULT_AI_INDEX_DATA_STREAM },
  automations: [],
  sources,
});

const toAiIndexSources = (selectedSources: SelectedSource[]): AiIndexSource[] =>
  selectedSources
    .filter((source) => source.type === 'esql_view')
    .map((source) => ({ type: 'esql', value: source.value }));

/**
 * Kibana HTTP errors carry the server-provided detail (e.g. why a `dest`
 * failed validation) on `error.body.message`, which is far more useful than the
 * generic `error.message` (`Bad Request`). Falls back to the generic message.
 */
const getErrorMessage = (error: unknown): string | undefined => {
  if (typeof error === 'object' && error !== null && 'body' in error) {
    const { body } = error;
    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
    ) {
      return body.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return undefined;
};

export const useCreateAiIndex = () => {
  const {
    services: { http, notifications },
  } = useKibana();
  const [isCreating, setIsCreating] = useState(false);

  const createAiIndex = useCallback(
    async (selectedSources: SelectedSource[]): Promise<CreatedAiIndex | undefined> => {
      setIsCreating(true);
      const { id, ...properties } = buildAiIndexProperties(toAiIndexSources(selectedSources));

      try {
        await http.put<PutAiIndexResponse>(buildPath(aiIndexByIdPath, { aiIndexId: id }), {
          version: AI_INDEX_API_VERSION,
          body: JSON.stringify(properties),
        });
        return { id };
      } catch (error) {
        const toastMessage = getErrorMessage(error);
        notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
          title: i18n.translate('xpack.contextEngine.createAiIndex.errorTitle', {
            defaultMessage: 'Unable to create AI index',
          }),
          ...(toastMessage ? { toastMessage } : {}),
        });
        return undefined;
      } finally {
        setIsCreating(false);
      }
    },
    [http, notifications]
  );

  return { createAiIndex, isCreating };
};
