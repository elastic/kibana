/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservableType } from '../../common/types/domain';
import { OBSERVABLE_TYPES_BUILTIN } from '../../common/constants';
import type { CasesClient } from './client';

export const getAvailableObservableTypes = async (casesClient: CasesClient, owner: string) => {
  const configurations = await casesClient.configure.get({
    owner,
  });
  const observableTypes = configurations?.[0]?.observableTypes ?? [];

  return [...observableTypes, ...OBSERVABLE_TYPES_BUILTIN];
};

export const getAvailableObservableTypesMap = async (
  casesClient: CasesClient,
  owner: string
): Promise<Map<string, ObservableType>> => {
  try {
    const observableTypes = await getAvailableObservableTypes(casesClient, owner);

    const availableObservableTypesSet = new Map(
      [...observableTypes, ...OBSERVABLE_TYPES_BUILTIN].map((observableType) => [
        observableType.key,
        observableType,
      ])
    );

    return availableObservableTypesSet;
  } catch (error) {
    return new Map();
  }
};
