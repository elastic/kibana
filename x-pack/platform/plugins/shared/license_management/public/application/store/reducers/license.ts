/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from 'redux-actions';
import { handleActions } from 'redux-actions';
import type { ILicense } from '@kbn/licensing-types';

import { addLicense } from '../actions/add_license';

export const license = handleActions<ILicense | null, ILicense>(
  {
    [String(addLicense)](_state: ILicense | null, { payload }: Action<ILicense>) {
      return payload;
    },
  },
  null
);
