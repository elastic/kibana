/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Field, InlineField } from '../../../../common/types/domain/template/fields';
import { INVESTIGATIONS_OWNER } from '../../../../common/investigations/constants';
import { useGetTemplate } from '../../../components/templates_v2/hooks/use_get_template';
import { useTemplateNonGlobalFields } from '../../../components/templates_v2/hooks/use_template_non_global_fields';

const NO_FIELDS: Field[] = [];

export interface TypeFields {
  /** The fields of the template, `$ref`s resolved against the field library. */
  fields: InlineField[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * The renderable fields of an investigation type: the Cases template at `version` (the latest one
 * when omitted) with its field library references resolved, as the Cases case page resolves them.
 */
export const useTypeFields = (templateId: string | undefined, version?: number): TypeFields => {
  const {
    data: template,
    isLoading: isLoadingTemplate,
    isError,
  } = useGetTemplate(templateId, version, { includeDeleted: true, silent: true });
  const definitionFields = template?.definition.fields ?? NO_FIELDS;
  const { resolvedFields, isLoading: isResolving } = useTemplateNonGlobalFields(
    definitionFields,
    INVESTIGATIONS_OWNER
  );

  return useMemo(
    () => ({
      fields: resolvedFields,
      isLoading: Boolean(templateId) && (isLoadingTemplate || isResolving),
      isError,
    }),
    [resolvedFields, templateId, isLoadingTemplate, isResolving, isError]
  );
};
