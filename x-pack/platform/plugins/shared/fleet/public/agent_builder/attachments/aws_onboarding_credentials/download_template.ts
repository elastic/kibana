/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendGetAwsOnboardingBootstrapTemplate } from '../../../hooks/use_request/aws_onboarding';

/** Fetches the fully-managed bootstrap template and saves it through a temporary anchor. */
export const downloadBootstrapTemplate = async (): Promise<void> => {
  const { data, error } = await sendGetAwsOnboardingBootstrapTemplate('fully-managed');
  if (error || !data) {
    throw error instanceof Error ? error : new Error('Failed to fetch the bootstrap template');
  }

  const blob = new Blob([data.template], { type: 'application/x-yaml' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = data.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
