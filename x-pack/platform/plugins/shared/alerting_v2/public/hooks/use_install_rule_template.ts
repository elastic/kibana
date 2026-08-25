/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { contentListQueryClient } from '@kbn/content-list-provider';
import type { RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { createRuleDataFromTemplate } from '../../common/create_rule_data_from_template';
import { useCreateRule } from './use_create_rule';
import { installedCountKeys } from './use_installed_rule_counts';

export const useInstallRuleTemplate = () => {
  const { mutateAsync } = useCreateRule();

  return useMutation({
    mutationFn: (template: RuleTemplateResponse) =>
      mutateAsync({ payload: createRuleDataFromTemplate(template), enabled: false }),
    onSuccess: (_data, template) => {
      contentListQueryClient.invalidateQueries(installedCountKeys.template(template.id));
    },
  });
};
