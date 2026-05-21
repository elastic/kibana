/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';
import { useGetTemplate } from './use_get_template';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

export interface UseParentTemplateDefinitionResult {
  definition: ParsedTemplateDefinition | undefined;
  isFetched: boolean;
}

export const useParentTemplateDefinition = (
  parentId: string | undefined
): UseParentTemplateDefinitionResult => {
  const { data: template, isFetched } = useGetTemplate(parentId, undefined, {
    silent: true,
    includeDeleted: true,
  });
  return { definition: template?.definition, isFetched };
};
