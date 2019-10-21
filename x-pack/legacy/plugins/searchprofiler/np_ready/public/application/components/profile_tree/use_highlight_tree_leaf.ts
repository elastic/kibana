/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useEffect, useState } from 'react';
import uuid from 'uuid';

import { useHighlightContext, OnHighlightChangeArgs } from './highlight_context';

export const useHighlightTreeLeaf = () => {
  const [id, setId] = useState<string>('');
  const { selectedRow, setStore } = useHighlightContext();

  const highlight = (value: OnHighlightChangeArgs) => {
    setStore({ id, ...value });
  };

  const isHighlighted = () => {
    return selectedRow === id;
  };

  useEffect(() => {
    const newId = uuid.v4();
    setId(newId);
  }, []);

  return {
    highlight,
    isHighlighted,
  };
};
