/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { isDisplayOnlyField } from '../../../../common/types/domain/template/fields';
import { parseFieldDefinitionsToInlineFields } from '../../../../common/utils';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useGetFieldDefinitions } from '../../field_library/hooks/use_get_field_definitions';

/**
 * Fetches and parses the owner's global field definitions into inline fields.
 * Global (isGlobal) fields apply to every case, so they map 1:1 to columns; migrated
 * legacy custom fields also surface here (migration writes them as global fields).
 * The fetch is skipped (owner undefined) when `enabled` is false so the legacy
 * customFields path pays no extra request.
 *
 * Display-only fields (e.g. MARKDOWN) are excluded: they hold no per-case value (they're static
 * authored content on the template form, not case data — see `isDisplayOnlyField`), so they can
 * never render anything in a column/field cell. Offering one as a toggleable column/field would
 * just be an always-empty option that looks broken.
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
    () =>
      parseFieldDefinitionsToInlineFields(data?.fieldDefinitions ?? []).filter(
        (field) => !isDisplayOnlyField(field)
      ),
    [data]
  );

  return { globalInlineFields, isLoading: enabled && isFetching };
};
