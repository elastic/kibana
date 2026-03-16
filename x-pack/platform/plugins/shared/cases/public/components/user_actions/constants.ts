/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { UserActionTypes } from '../../../common/types/domain';
import type { SupportedUserActionTypes } from './types';

export const DRAFT_COMMENT_STORAGE_ID = 'xpack.cases.commentDraft';

export const UNSUPPORTED_ACTION_TYPES = ['delete_case'] as const;
export const SUPPORTED_ACTION_TYPES: SupportedUserActionTypes[] = Object.keys(
  omit(UserActionTypes, UNSUPPORTED_ACTION_TYPES)
) as SupportedUserActionTypes[];

export const NEW_COMMENT_ID = 'newComment';
