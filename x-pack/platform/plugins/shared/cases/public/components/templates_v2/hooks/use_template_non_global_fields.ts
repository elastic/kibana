/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Field, InlineField } from '../../../../common/types/domain/template/fields';
import { isInlineField } from '../../../../common/types/domain/template/fields';
import { parseFieldDefinitionsToInlineFields } from '../../../../common/utils';
import { useGetFieldDefinitions } from '../../field_library/hooks/use_get_field_definitions';
import { useResolvedFields } from '../../field_library/hooks/use_resolved_fields';

/**
 * Resolves the non-global fields of a template definition:
 * 1. Fetches the owner's global field definitions (those already rendered by the
 *    GlobalCaseFields section and not owned by any template).
 * 2. Strips inline fields whose name appears in the global set so they are not
 *    shown twice in the UI.
 * 3. Passes the remaining fields through `useResolvedFields` to expand `$ref`
 *    entries into their full inline definition.
 */
export const useTemplateNonGlobalFields = (
  templateDefinitionFields: Field[],
  owner: string
): { resolvedFields: InlineField[]; isLoading: boolean } => {
  const { data: globalFieldDefsData, isLoading: isLoadingGlobalFields } = useGetFieldDefinitions({
    owner,
    isGlobal: true,
    staleTime: Infinity,
  });

  const nonGlobalFields = useMemo(() => {
    const globalNames = new Set(
      parseFieldDefinitionsToInlineFields(globalFieldDefsData?.fieldDefinitions ?? []).map(
        (f) => f.name
      )
    );
    return templateDefinitionFields.filter((f) => !isInlineField(f) || !globalNames.has(f.name));
  }, [templateDefinitionFields, globalFieldDefsData]);

  const { resolvedFields, isLoading: isResolving } = useResolvedFields(nonGlobalFields, owner);

  return { resolvedFields, isLoading: isResolving || isLoadingGlobalFields };
};
