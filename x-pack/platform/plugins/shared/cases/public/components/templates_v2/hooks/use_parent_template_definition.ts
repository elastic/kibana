/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';
import { parseExtendsRef } from '../utils/parse_extends_ref';
import { useGetTemplate } from './use_get_template';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

export interface UseParentTemplateDefinitionResult {
  definition: ParsedTemplateDefinition | undefined;
  isFetched: boolean;
}

/**
 * Resolve the parent template for a given `extends` ref string.
 *
 * The ref may be a bare templateId (`"<id>"`) or a version-pinned ref
 * (`"<id>@<version>"`). When no version is given the latest version is used.
 */
export const useParentTemplateDefinition = (
  extendsRef: string | undefined
): UseParentTemplateDefinitionResult => {
  const { templateId, version } = parseExtendsRef(extendsRef);
  const { data: template, isFetched } = useGetTemplate(templateId, version, {
    silent: true,
    includeDeleted: true,
  });
  return { definition: template?.definition, isFetched };
};
