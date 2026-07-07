/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { DataConditionTypeDescriptor } from '../components/types';
import {
  createFieldChangeDescriptor,
  severityChangeDescriptor,
  severityEqualsDescriptor,
} from '../components/built_in_data_conditions';
import { useAlertFieldOptions } from './use_alert_field_options';

export interface UseDataConditionTypesParams {
  /** Kibana http client used to fetch the alert index fields. */
  http: HttpStart;
  /** Rule type ids whose alert index fields populate the `field_change` dropdown. */
  ruleTypeIds: string[];
}

/**
 * Builds the built-in `field_change` descriptor with its field dropdown backed
 * by the alert index fields for the given rule types. Use this when composing a
 * custom `dataConditionTypes` list; the fetch is react-query cached/deduped by
 * `ruleTypeIds`.
 */
export const useFieldChangeDescriptor = ({
  http,
  ruleTypeIds,
}: UseDataConditionTypesParams): DataConditionTypeDescriptor => {
  const { fieldOptions, isLoading } = useAlertFieldOptions({ http, ruleTypeIds });

  return useMemo(
    () => createFieldChangeDescriptor({ options: fieldOptions, isLoading }),
    [fieldOptions, isLoading]
  );
};

/**
 * Returns the default data-condition descriptor list with the `field_change`
 * dropdown wired to the alert index fields for the given rule types. This is the
 * low-boilerplate way for consumers to enable the searchable field selector:
 * pass the result straight to `dataConditionTypes`. For bespoke sets, compose
 * from `useFieldChangeDescriptor` + the individual severity descriptors instead.
 */
export const useDataConditionTypes = ({
  http,
  ruleTypeIds,
}: UseDataConditionTypesParams): readonly DataConditionTypeDescriptor[] => {
  const fieldChangeDescriptor = useFieldChangeDescriptor({ http, ruleTypeIds });

  return useMemo(
    () => [fieldChangeDescriptor, severityChangeDescriptor, severityEqualsDescriptor],
    [fieldChangeDescriptor]
  );
};
