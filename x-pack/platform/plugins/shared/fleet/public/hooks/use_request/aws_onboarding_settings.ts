/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AwsOnboardingSettingsAnswer,
  SettingsProblem,
} from '../../../common/workflows/steps/settings';
import { API_VERSIONS, AWS_ONBOARDING_API_ROUTES } from '../../../common/constants';

import { sendRequest } from './use_request';

export interface SubmitAwsOnboardingSettingsResponse {
  status: 'resumed' | 'invalid';
  problems?: SettingsProblem[];
}

export function sendSubmitAwsOnboardingSettings(
  executionId: string,
  answer: AwsOnboardingSettingsAnswer
) {
  return sendRequest<SubmitAwsOnboardingSettingsResponse>({
    method: 'post',
    path: AWS_ONBOARDING_API_ROUTES.SETTINGS_PATTERN.replace(
      '{executionId}',
      encodeURIComponent(executionId)
    ),
    version: API_VERSIONS.internal.v1,
    body: answer,
  });
}
