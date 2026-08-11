/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { reloadIndices } from '.';
import { httpService } from '../../services/http';
import type { AppDispatch } from '../types';
import { getHttpErrorToastMessage } from '../http_error';
import type { AppDependencies } from '../../app_context';

export const performExtensionAction =
  ({
    requestMethod,
    indexNames,
    successMessage,
  }: {
    requestMethod: (indexNames: string[], http: HttpSetup) => Promise<void>;
    indexNames: string[];
    successMessage: string;
  }) =>
  async (
    dispatch: AppDispatch,
    _getState: () => unknown,
    { notificationService }: AppDependencies['services']
  ) => {
    try {
      await requestMethod(indexNames, httpService.httpClient);
    } catch (error) {
      notificationService.showDangerToast(getHttpErrorToastMessage(error));
      return;
    }
    dispatch(reloadIndices(indexNames));
    notificationService.showSuccessToast(successMessage);
  };
