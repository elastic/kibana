/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useHighlightContext, OnHighlightChangeArgs } from './highlight_context';

export const useHighlightTreeNode = () => {
  const idRef = useRef<string>(uuidv4());
  const { selectedRow, setStore } = useHighlightContext();

  const highlight = (value: OnHighlightChangeArgs) => {
    setStore({ id: idRef.current, ...value });
  };

  const isHighlighted = () => {
    return selectedRow === idRef.current;
  };

  return {
    id: idRef.current,
    highlight,
    isHighlighted,
  };
};
