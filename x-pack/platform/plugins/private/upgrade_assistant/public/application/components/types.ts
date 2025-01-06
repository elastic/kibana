/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResponseError } from '../../../common/types';

export enum LoadingState {
  Loading,
  Success,
  Error,
}

export enum CancelLoadingState {
  Requested,
  Loading,
  Success,
  Error,
}

export type DeprecationTableColumns =
  | 'type'
  | 'index'
  | 'message'
  | 'correctiveAction'
  | 'isCritical';

export type Status = 'in_progress' | 'complete' | 'idle' | 'error';
export interface DeprecationLoggingPreviewProps {
  isDeprecationLogIndexingEnabled: boolean;
  onlyDeprecationLogWritingEnabled: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  fetchError: ResponseError | null;
  updateError: ResponseError | undefined;
  resendRequest: () => void;
  toggleLogging: () => void;
}

export interface OverviewStepProps {
  isComplete: boolean;
  setIsComplete: (isComplete: boolean) => void;
}
