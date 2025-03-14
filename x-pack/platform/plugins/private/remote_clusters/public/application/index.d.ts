/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, ScopedHistory, ExecutionContextStart } from '@kbn/core/public';
import { RegisterManagementAppArgs } from '../types';

export declare const renderApp: (
  elem: HTMLElement | null,
  appDependencies: {
    isCloudEnabled: boolean;
    cloudBaseUrl: string;
    cloudDeploymentUrl: string;
    executionContext: ExecutionContextStart;
    canUseAPIKeyTrustModel: boolean;
  },
  history: ScopedHistory,
  startServices: Pick<CoreStart, 'analytics' | 'i18n' | 'theme' | 'userProfile'>
) => ReturnType<RegisterManagementAppArgs['mount']>;
