/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRouter, getUserHasLeftApp } from '../../services';
import { CLONE_JOB_START } from '../action_types';
import { CRUD_APP_BASE_PATH } from '../../constants';

export const cloneJob = () => next => action => {
  const { type } = action;

  if (type === CLONE_JOB_START) {
    if (!getUserHasLeftApp()) {
      getRouter().history.push({
        pathname: `${CRUD_APP_BASE_PATH}/create`,
      });
    }
  }

  return next(action);
};
