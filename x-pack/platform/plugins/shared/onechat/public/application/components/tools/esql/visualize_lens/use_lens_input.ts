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

/**
 * Check if config is valid for conversion to Lens format
 * API format must have a 'type' property
 */
const isValidApiFormat = (config: any): boolean => {
  return config && typeof config === 'object' && 'type' in config;
};

export function useLensInput({ dataViews, lens, lensConfig }: Params): ReturnValue {
  const lensHelpersAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  // Convert lens config to lens attributes, or use directly if already in Lens format
  // Also track any conversion errors
  const { lensAttributes, conversionError } = useMemo(() => {
    // Handle undefined/null lensConfig
    if (!lensConfig || typeof lensConfig !== 'object') {
      return {
        lensAttributes: undefined,
        conversionError: new Error('Invalid visualization configuration: no data provided'),
      };
    }
    if (isLensFormat(lensConfig)) {
      // Already in Lens format (e.g., from ES|QL suggestions or promoted from chat)
      return { lensAttributes: lensConfig, conversionError: undefined };
    }
    // Check if it's valid API format before trying to convert
    if (!isValidApiFormat(lensConfig)) {
      // Invalid format - return error
      return {
        lensAttributes: undefined,
        conversionError: new Error(
          'Invalid visualization configuration: missing required "type" property'
        ),
      };
    }
    // API format - needs conversion via LensConfigBuilder
    try {
      return {
        lensAttributes: new LensConfigBuilder().fromAPIFormat(lensConfig),
        conversionError: undefined,
      };
    } catch (err) {
      return {
        lensAttributes: undefined,
        conversionError: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }, [lensConfig]);

  const [lensInput, setLensInput] = useState<TypedLensByValueInput | undefined>(
    lensAttributes
      ? {
          attributes: lensAttributes,
          id: uuidv4(),
        }
      : undefined
  );

  const isLoading = !lensHelpersAsync.value || (!lensInput && !conversionError);

  return {
    lensInput,
    setLensInput,
    isLoading,
    error: conversionError || lensHelpersAsync.error || undefined,
  };
}
