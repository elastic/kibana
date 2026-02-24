/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { TimeRange } from '@kbn/es-query';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { LensPublicStart, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import useAsync from 'react-use/lib/useAsync';

interface Params {
  dataViews: DataViewsServicePublic;
  lens: LensPublicStart;
  lensConfig: any;
  timeRange?: TimeRange;
  searchSessionId?: string;
}

interface ReturnValue {
  lensInput: TypedLensByValueInput | undefined;
  setLensInput: (v: TypedLensByValueInput) => void;
  isLoading: boolean;
  error?: Error;
}

export function useLensInput({
  dataViews,
  lens,
  lensConfig,
  timeRange,
  searchSessionId,
}: Params): ReturnValue {
  const lensHelpersAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  // convert lens config to lens attributes
  const lensAttributes = useMemo(() => {
    return new LensConfigBuilder().fromAPIFormat(lensConfig);
  }, [lensConfig]);

  const [lensInput, setLensInput] = useState<TypedLensByValueInput | undefined>({
    attributes: lensAttributes,
    id: uuidv4(),
    ...(timeRange ? { timeRange } : {}),
    ...(searchSessionId ? { searchSessionId } : {}),
  });

  const isLoading = !lensHelpersAsync.value || !lensInput;

  return {
    lensInput,
    setLensInput,
    isLoading,
    error: lensHelpersAsync.error || undefined,
  };
}
