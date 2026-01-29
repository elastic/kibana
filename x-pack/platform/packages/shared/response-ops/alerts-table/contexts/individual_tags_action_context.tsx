/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { createContext, useContext } from 'react';
import { typedMemo } from '../utils/react';
import type { TagsActionState } from '../components/tags/use_tags_action';

const IndividualTagsActionContext = createContext<TagsActionState | null>(null);

export const IndividualTagsActionContextProvider = typedMemo(
  ({
    children,
    value,
  }: PropsWithChildren<{
    value: TagsActionState;
  }>) => {
    return (
      <IndividualTagsActionContext.Provider value={value}>
        {children}
      </IndividualTagsActionContext.Provider>
    );
  }
);

export const useIndividualTagsActionContext = (): TagsActionState => {
  const context = useContext(IndividualTagsActionContext);
  if (!context) {
    throw new Error(
      'useIndividualTagsActionContext must be used within IndividualTagsActionContextProvider'
    );
  }
  return context;
};
