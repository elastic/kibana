/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type {
  ListDreamingTemplatesResponse,
  LoadedDreamingTemplate,
} from '../../../common/dreaming_templates';
import { listDreamingTemplates } from '../api/dreaming_templates';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

const STATIC = { staleTime: Infinity, cacheTime: Infinity } as const;

/** Lists the example dreaming configs in display order. */
export const useDreamingTemplates = (): {
  templates: LoadedDreamingTemplate[];
  isLoading: boolean;
  error: Error | undefined;
} => {
  const {
    services: { http },
  } = useKibana();
  const { data, isLoading, error } = useQuery<ListDreamingTemplatesResponse, Error>({
    queryKey: contextEngineQueryKeys.dreamingTemplates.list(),
    queryFn: ({ signal }) => listDreamingTemplates(http, { signal }),
    ...STATIC,
  });
  return { templates: data?.templates ?? [], isLoading, error: error ?? undefined };
};
