/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABLE_TYPES_BUILTIN } from '../../common/constants';
import type { CasesClient } from './client';

export const getAvailableObservableTypesSet = async (casesClient: CasesClient, owner: string) => {
  try {
    const configurations = await casesClient.configure.get({
      owner,
    });
    const observableTypes = configurations?.[0]?.observableTypes ?? [];

    const availableObservableTypesSet = new Set(
      [...observableTypes, ...OBSERVABLE_TYPES_BUILTIN].map(({ key }) => key)
    );

    return availableObservableTypesSet;
  } catch (error) {
    return new Set<string>();
  }
};
