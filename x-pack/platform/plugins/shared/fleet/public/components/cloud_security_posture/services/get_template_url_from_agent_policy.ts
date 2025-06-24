/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '../../../types';

export const SUPPORTED_TEMPLATES_URL_FROM_AGENT_POLICY_CONFIG = {
  CLOUD_FORMATION: 'cloud_formation_template_url',
  ARM_TEMPLATE: 'arm_template_url',
};

export const getTemplateUrlFromAgentPolicy = (
  templateUrlFieldName: string,
  selectedPolicy?: AgentPolicy
) => {
  const cloudFormationTemplateUrl = selectedPolicy?.package_policies?.reduce(
    (acc, packagePolicy) => {
      const findCloudFormationTemplateUrlConfig = packagePolicy.inputs?.reduce(
        (accInput, input) => {
          if (accInput !== '') {
            return accInput;
          }
          if (input?.enabled && input?.config?.[templateUrlFieldName]) {
            return input.config[templateUrlFieldName].value;
          }
          return accInput;
        },
        ''
      );
      if (findCloudFormationTemplateUrlConfig) {
        return findCloudFormationTemplateUrlConfig;
      }
      return acc;
    },
    ''
  );
  return cloudFormationTemplateUrl !== '' ? cloudFormationTemplateUrl : undefined;
};
