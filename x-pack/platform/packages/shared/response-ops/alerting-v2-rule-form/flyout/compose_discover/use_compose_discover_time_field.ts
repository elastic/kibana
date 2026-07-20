/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import type { FormValues } from '../../form/types';
import { useRuleFormServices } from '../../form/contexts/rule_form_context';
import { getTimeFieldResolutionQuery } from './get_time_field_resolution_query';
import { useResolveTimeField } from './use_resolve_time_field';

export interface TimeFieldOption {
  value: string;
  text: string;
}

export interface ComposeDiscoverTimeFieldValue {
  timeFieldOptions: TimeFieldOption[];
  isTimeFieldResolved: boolean;
}

/**
 * Derives time-field resolution for the compose flyout purely from the current
 * form values (`query` + `timeField`) and the rule-form services. Read-only: it
 * never auto-selects a field (the flyout owns that side effect); consumers use
 * it to render the select options and to gate on whether a valid date field
 * exists for the rule's lookback window.
 */
export const useComposeDiscoverTimeField = (): ComposeDiscoverTimeFieldValue => {
  const { watch } = useFormContext<FormValues>();
  const query = watch('query');
  const timeField = watch('timeField') ?? '@timestamp';
  const isAlert = watch('kind') === 'alert';
  const { http, dataViews } = useRuleFormServices();

  const resolutionQuery = useMemo(
    () => getTimeFieldResolutionQuery(query, isAlert, true),
    [query, isAlert]
  );

  return useResolveTimeField({ query: resolutionQuery, timeField, http, dataViews });
};
