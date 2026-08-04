/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { parseFieldDefinitionsToInlineFields } from '../../../../common/utils';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useGetFieldDefinitions } from '../../field_library/hooks/use_get_field_definitions';

/**
 * Fetches and parses the owner's global field definitions into inline fields.
 */
export const useGlobalInlineFields = ({ enabled = true }: { enabled?: boolean } = {}): {
  globalInlineFields: InlineField[];
  isLoading: boolean;
} => {
  const { owner } = useCasesContext();
  const { data, isFetching } = useGetFieldDefinitions({
    owner: enabled ? owner : undefined,
    isGlobal: true,
    // Fetch once per session; a new array reference on refetch would churn the column memos.
    staleTime: Infinity,
  });

  const globalInlineFields = useMemo(
    () => parseFieldDefinitionsToInlineFields(data?.fieldDefinitions ?? []),
    [data]
  );

  return { globalInlineFields, isLoading: enabled && isFetching };
};
