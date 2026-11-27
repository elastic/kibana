/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import {
  collectNormalizedRefNames,
  normalizeFieldDefinitionName,
  parseFieldDefinitionsToInlineFields,
} from '../../../../common/utils';
import { INVESTIGATIONS_OWNER } from '../../../../common/investigations/constants';
import { useGetFieldDefinitions } from '../../../components/field_library/hooks/use_get_field_definitions';
import { useGetTemplate } from '../../../components/templates_v2/hooks/use_get_template';
import type { TypeFields } from './use_type_fields';

const NO_DEFINITIONS: FieldDefinition[] = [];

const byDisplayOrder = (definitions: FieldDefinition[]): FieldDefinition[] =>
  definitions
    .map((definition, index) => ({ definition, index }))
    .sort(
      (a, b) =>
        (a.definition.displayOrder ?? a.index) - (b.definition.displayOrder ?? b.index) ||
        a.index - b.index
    )
    .map(({ definition }) => definition);

/**
 * The global fields of the owner: the Cases field library definitions with `isGlobal`, in the
 * order Cases lists them. A global field the template references with `$ref` is left out because
 * the template's fields draw it, as `GlobalCaseFields` does on the Cases case page.
 */
export const useGlobalFields = (templateId?: string, version?: number): TypeFields => {
  const {
    data,
    isLoading: isLoadingDefinitions,
    isError,
  } = useGetFieldDefinitions({ owner: INVESTIGATIONS_OWNER, isGlobal: true, staleTime: Infinity });
  const { data: template, isLoading: isLoadingTemplate } = useGetTemplate(templateId, version, {
    includeDeleted: true,
    silent: true,
  });

  const templateRefNames = useMemo<ReadonlySet<string>>(
    () => collectNormalizedRefNames(template?.definition.fields),
    [template]
  );
  const definitions = data?.fieldDefinitions ?? NO_DEFINITIONS;
  const fields = useMemo<InlineField[]>(
    () =>
      parseFieldDefinitionsToInlineFields(byDisplayOrder(definitions)).filter(
        ({ name }) => !templateRefNames.has(normalizeFieldDefinitionName(name))
      ),
    [definitions, templateRefNames]
  );

  return useMemo(
    () => ({
      fields,
      isLoading: isLoadingDefinitions || (Boolean(templateId) && isLoadingTemplate),
      isError,
    }),
    [fields, isLoadingDefinitions, templateId, isLoadingTemplate, isError]
  );
};
