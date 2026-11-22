/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import {
  getIndicatorTypeLabel,
  getIndicatorTypeOptions,
} from '../../../../common/investigations/observable_types';
import type { IndicatorTypeOption } from '../../../../common/investigations/observable_types';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';

export interface IndicatorTypes {
  /** The Cases built-in observable types followed by the custom ones from the Cases configuration. */
  options: IndicatorTypeOption[];
  getLabel: (key: string) => string;
}

/** Indicator types are the Cases observable types: built in plus the custom ones in the Cases settings. */
export const useIndicatorTypes = (): IndicatorTypes => {
  const { data } = useGetCaseConfiguration();
  const customTypes = data?.observableTypes;
  const options = useMemo(() => getIndicatorTypeOptions(customTypes ?? []), [customTypes]);
  const getLabel = useCallback(
    (key: string) => getIndicatorTypeLabel(key, customTypes ?? []),
    [customTypes]
  );

  return { options, getLabel };
};
