/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { map } from 'rxjs';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

/** Subscribes to `services.spaces.getActiveSpace$()` and returns the active space id. */
export const useSpaceId = (spaces: SpacesPluginStart): string => {
  const spaceId$ = useMemo(() => spaces.getActiveSpace$().pipe(map((space) => space.id)), [spaces]);

  return useObservable(spaceId$, DEFAULT_SPACE_ID);
};
