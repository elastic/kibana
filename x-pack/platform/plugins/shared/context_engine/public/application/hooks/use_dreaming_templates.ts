/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type {
  DreamingTemplate,
  DreamingTemplateIndex,
  DreamingTemplateSummary,
} from '../../../common/dreaming_templates';
import { getDreamingTemplate, listDreamingTemplates } from '../api/dreaming_templates';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

// Static files that only change with a Kibana upgrade.
const STATIC = { staleTime: Infinity, cacheTime: Infinity } as const;

/** Lists the example dreaming configs offered when an AI index is created. */
export const useDreamingTemplates = (): {
  templates: DreamingTemplateSummary[];
  isLoading: boolean;
  error: Error | undefined;
} => {
  const {
    services: { http },
  } = useKibana();
  const { data, isLoading, error } = useQuery<DreamingTemplateIndex, Error>({
    queryKey: contextEngineQueryKeys.dreamingTemplates.list(),
    queryFn: ({ signal }) => listDreamingTemplates(http, { signal }),
    ...STATIC,
  });
  return { templates: data?.templates ?? [], isLoading, error: error ?? undefined };
};

/** Loads one example dreaming config; nothing while `id` is undefined. */
export const useDreamingTemplate = (
  id: string | undefined
): { template: DreamingTemplate | undefined; isLoading: boolean; error: Error | undefined } => {
  const {
    services: { http },
  } = useKibana();
  const { data, isInitialLoading, error } = useQuery<DreamingTemplate, Error>({
    queryKey: contextEngineQueryKeys.dreamingTemplates.detail(id ?? ''),
    queryFn: ({ signal }) => getDreamingTemplate(http, { id: id ?? '', signal }),
    enabled: id !== undefined,
    ...STATIC,
  });
  return { template: data, isLoading: isInitialLoading, error: error ?? undefined };
};

export type LoadedDreamingTemplate = DreamingTemplateSummary & DreamingTemplate;

/** Every example dreaming config, loaded, in `index.json` order. */
export const useAllDreamingTemplates = (): {
  templates: LoadedDreamingTemplate[];
  isLoading: boolean;
  error: Error | undefined;
} => {
  const {
    services: { http },
  } = useKibana();
  const { data, isLoading, error } = useQuery<LoadedDreamingTemplate[], Error>({
    queryKey: contextEngineQueryKeys.dreamingTemplates.all(),
    queryFn: async ({ signal }) => {
      const { templates } = await listDreamingTemplates(http, { signal });
      return Promise.all(
        templates.map(async (summary) => ({
          ...summary,
          ...(await getDreamingTemplate(http, { id: summary.id, signal })),
        }))
      );
    },
    ...STATIC,
  });
  return { templates: data ?? [], isLoading, error: error ?? undefined };
};
