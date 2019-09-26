/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { GitBlame } from '../../common/git_blame';

export interface LoadBlamePayload {
  repoUri: string;
  revision: string;
  path: string;
}

export const loadBlame = createAction<LoadBlamePayload>('LOAD BLAME');
export const loadBlameSuccess = createAction<GitBlame[]>('LOAD BLAME SUCCESS');
export const loadBlameFailed = createAction<Error>('LOAD BLAME FAILED');
