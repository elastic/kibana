/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '../../../types';

/**
 * Get the cloud shell url from a agent policy
 * It looks for a config with a cloud_shell_url object present in
 * the enabled package_policies inputs of the agent policy
 */
export const getCloudShellUrlFromAgentPolicy = (selectedPolicy?: AgentPolicy) => {
  const cloudShellUrl = selectedPolicy?.package_policies?.reduce((acc, packagePolicy) => {
    const findCloudShellUrlConfig = packagePolicy.inputs?.reduce((accInput, input) => {
      if (accInput !== '') {
        return accInput;
      }
      if (input?.enabled && input?.config?.cloud_shell_url) {
        return input.config.cloud_shell_url.value;
      }
      return accInput;
    }, '');
    if (findCloudShellUrlConfig) {
      return findCloudShellUrlConfig;
    }
    return acc;
  }, '');
  return cloudShellUrl !== '' ? cloudShellUrl : undefined;
};
