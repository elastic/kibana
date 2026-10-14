/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';

/** Whether PDFs can be pasted. Asked once per page load; `false` when the check fails. */
export const useIsPdfUploadAvailable = (): boolean => {
  const { attachmentsService } = useAgentBuilderServices();

  const { data } = useQuery({
    queryKey: queryKeys.attachments.pdfAvailable,
    queryFn: async () => {
      try {
        return await attachmentsService.isPdfAvailable();
      } catch {
        return false;
      }
    },
    staleTime: Infinity,
  });

  return data ?? false;
};
