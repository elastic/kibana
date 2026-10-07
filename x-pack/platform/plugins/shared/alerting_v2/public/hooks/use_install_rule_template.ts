/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { useCreateRule } from './use_create_rule';

export const useInstallRuleTemplate = () => {
  const { mutateAsync } = useCreateRule();

  return useMutation({
    mutationFn: (template: RuleTemplateResponse) =>
      mutateAsync({ payload: template.rule, enabled: false }),
  });
};
