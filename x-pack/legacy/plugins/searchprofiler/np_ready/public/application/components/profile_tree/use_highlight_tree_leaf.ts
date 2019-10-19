/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useEffect, useState } from 'react';
import uuid from 'uuid';

import { useHighlightContext } from './highlight_context';

export const useHighlightTreeLeaf = () => {
  const [id, setId] = useState<string>('');
  const { store, setStore } = useHighlightContext();

  const highlight = () => {
    setStore(id, true);
  };

  const isHighlighted = () => {
    return store[id];
  };

  useEffect(() => {
    const newId = uuid.v4();
    setId(newId);
    setStore(newId, false);
  }, []);

  return {
    highlight,
    isHighlighted,
  };
};
