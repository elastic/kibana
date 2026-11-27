/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedHistory } from '@kbn/core/public';
import type { HttpSetup, NotificationsStart } from '@kbn/core/public';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import type { ILicense } from '@kbn/licensing-types';
import type { ThunkAction, UnknownAction } from '@reduxjs/toolkit';
import type { TelemetryPluginStart } from '@kbn/telemetry-plugin/public';
import type { BreadcrumbService } from '../breadcrumbs';

export interface UploadStatusState {
  acknowledge?: boolean;
  applying?: boolean;
  messages?: Array<string | string[]>;
  invalid?: boolean;
}

export interface StartBasicStatusState {
  acknowledge?: boolean;
  messages?: string[];
}

export interface TrialStatusState {
  canStartTrial?: boolean;
  startTrialError?: string;
}

export interface PermissionsError {
  message?: string;
}

export interface PermissionsState {
  loading?: boolean;
  hasPermission?: boolean;
  error?: PermissionsError;
}

export type LicenseState = Pick<ILicense, 'type' | 'expiryDateInMillis' | 'isActive'>;

export interface LicenseManagementState {
  license: LicenseState | null;
  uploadStatus: UploadStatusState;
  uploadErrorMessage: string;
  trialStatus: TrialStatusState;
  startBasicStatus: StartBasicStatusState;
  permissions: PermissionsState;
}

export interface ThunkServices {
  history: ScopedHistory;
  toasts: NotificationsStart['toasts'];
  http: HttpSetup;
  telemetry?: TelemetryPluginStart;
  licensing: LicensingPluginSetup;
  breadcrumbService: BreadcrumbService;
}

export type AppThunkAction<R = void> = ThunkAction<
  R,
  LicenseManagementState,
  ThunkServices,
  UnknownAction
>;
