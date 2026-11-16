/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AwsOnboardingSettingsAnswer,
  SettingsProblem,
} from '../../../../common/workflows/steps/settings';
import { sendSubmitAwsOnboardingSettings } from '../../../hooks/use_request/aws_onboarding_settings';
import { toRequestError } from '../../../hooks/use_request/errors';

export type SubmitSettingsResult =
  | { status: 'resumed' }
  | { status: 'invalid'; problems: SettingsProblem[] };

/** Sends the answer; resolves with the outcome and throws the server message on a request error. */
export const submitSettings = async (
  executionId: string,
  answer: AwsOnboardingSettingsAnswer
): Promise<SubmitSettingsResult> => {
  const { data, error } = await sendSubmitAwsOnboardingSettings(executionId, answer);
  if (error || !data) {
    throw toRequestError(error, 'Failed to submit the settings');
  }
  return data.status === 'resumed'
    ? { status: 'resumed' }
    : { status: 'invalid', problems: data.problems ?? [] };
};
