/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { API_ROUTE_WORKPAD } from '../../common/lib/constants';

export async function getHasWorkpads(http: HttpSetup): Promise<boolean> {
  try {
    const response = await http.get(`${API_ROUTE_WORKPAD}/hasWorkpads`, {
      version: '1',
    });
    return (response as { hasWorkpads: boolean })?.hasWorkpads ?? false;
  } catch (error) {
    return false;
  }
}
