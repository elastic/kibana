/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import { BASE_ACTION_API_PATH } from '../constants';
import { ActionType } from '../../types';

export async function loadActionTypes({ http }: { http: HttpSetup }): Promise<ActionType[]> {
  return await http.get(`${BASE_ACTION_API_PATH}/types`);
}
