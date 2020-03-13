/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { Toast } from '@elastic/eui/src/components/toast/global_toast_list';

export const createToast = createAction<Toast>('CREATE_TOAST');
export const dismissToastById = createAction<string>('DISMISS_TOAST');
