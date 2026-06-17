/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import type { Space } from '../../../common';
import type { SpacesManager } from '../../spaces_manager';

export const useActiveSpace = (spacesManager: SpacesManager): Space | null => {
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);

  useEffect(() => {
    const sub = spacesManager.onActiveSpaceChange$.subscribe((space) => {
      setActiveSpace(space);
    });
    return () => sub.unsubscribe();
  }, [spacesManager]);

  return activeSpace;
};
