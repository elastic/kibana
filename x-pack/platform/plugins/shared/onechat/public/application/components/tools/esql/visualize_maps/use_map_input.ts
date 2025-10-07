/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import type { MapAttributes } from '@kbn/maps-plugin/server/content_management/schema/v1/map_attributes_schema/types';
import type { MapEmbeddableState } from '@kbn/maps-plugin/common';

interface Params {
  mapConfig: MapAttributes;
}

interface ReturnValue {
  mapInput: MapEmbeddableState | undefined;
  setMapInput: (v: MapEmbeddableState) => void;
  isLoading: boolean;
}

export function useMapInput({ mapConfig }: Params): ReturnValue {
  const mapInput = useMemo<MapEmbeddableState>(
    () => ({
      attributes: mapConfig,
    }),
    [mapConfig]
  );

  const [currentMapInput, setMapInput] = useState<MapEmbeddableState>(mapInput);

  const isLoading = !currentMapInput;

  return {
    mapInput: currentMapInput,
    setMapInput,
    isLoading,
  };
}
