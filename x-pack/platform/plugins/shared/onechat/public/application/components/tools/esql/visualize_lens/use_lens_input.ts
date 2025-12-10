/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { LensPublicStart, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import useAsync from 'react-use/lib/useAsync';

interface Params {
  dataViews: DataViewsServicePublic;
  lens: LensPublicStart;
  lensConfig: any;
}

interface ReturnValue {
  lensInput: TypedLensByValueInput | undefined;
  setLensInput: (v: TypedLensByValueInput) => void;
  isLoading: boolean;
  error?: Error;
}

/**
 * Detect if config is already in Lens format (has visualizationType)
 * vs API format (has chartType) which needs conversion
 */
const isLensFormat = (config: any): boolean => {
  return config && typeof config === 'object' && 'visualizationType' in config;
};

export function useLensInput({ dataViews, lens, lensConfig }: Params): ReturnValue {
  const lensHelpersAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  // convert lens config to lens attributes, or use directly if already in Lens format
  const lensAttributes = useMemo(() => {
    if (isLensFormat(lensConfig)) {
      // Already in Lens format (e.g., from ES|QL suggestions or promoted from chat)
      return lensConfig;
    }
    // API format - needs conversion via LensConfigBuilder
    return new LensConfigBuilder().fromAPIFormat(lensConfig);
  }, [lensConfig]);

  const [lensInput, setLensInput] = useState<TypedLensByValueInput | undefined>({
    attributes: lensAttributes,
    id: uuidv4(),
  });

  const isLoading = !lensHelpersAsync.value || !lensInput;

  return {
    lensInput,
    setLensInput,
    isLoading,
    error: lensHelpersAsync.error || undefined,
  };
}
