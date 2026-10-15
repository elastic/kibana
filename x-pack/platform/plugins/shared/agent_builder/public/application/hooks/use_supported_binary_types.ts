/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { SupportedBinaryMimeType } from '@kbn/agent-builder-common/attachments';
import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';

const NO_BINARY_TYPES: readonly SupportedBinaryMimeType[] = [];

/** The document types that can be pasted. Asked once per page load; empty when the check fails. */
export const useSupportedBinaryTypes = (): readonly SupportedBinaryMimeType[] => {
  const { attachmentsService } = useAgentBuilderServices();

  const { data } = useQuery({
    queryKey: queryKeys.attachments.supportedBinaryTypes,
    queryFn: async () => {
      try {
        return await attachmentsService.getSupportedBinaryMimeTypes();
      } catch {
        return NO_BINARY_TYPES;
      }
    },
    staleTime: Infinity,
  });

  return data ?? NO_BINARY_TYPES;
};
