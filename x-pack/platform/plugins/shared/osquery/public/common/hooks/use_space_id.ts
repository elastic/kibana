/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { useKibana } from '../lib/kibana';

const DEFAULT_SPACE_ID = 'default';

export const useSpaceId = (): string | undefined => {
  const { spaces } = useKibana().services;
  const [spaceId, setSpaceId] = useState<string | undefined>(spaces ? undefined : DEFAULT_SPACE_ID);

  useEffect(() => {
    if (spaces) {
      spaces
        .getActiveSpace()
        .then((space) => setSpaceId(space.id))
        .catch(() => setSpaceId(DEFAULT_SPACE_ID));
    }
  }, [spaces]);

  return spaceId;
};
