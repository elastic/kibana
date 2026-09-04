/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHistory, useLocation } from 'react-router-dom';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { RuleTemplatesApi } from '../services/rule_templates_api';

/** Opens the create-rule flyout when the URL contains `templateId`. */
export const useCreateFromTemplateQuery = (
  openCreateFromTemplateFlyout: (template: RuleTemplateResponse) => void
): void => {
  const location = useLocation();
  const history = useHistory();
  const ruleTemplatesApi = useService(RuleTemplatesApi);
  const { toasts } = useService(CoreStart('notifications'));

  const templateId = new URLSearchParams(location.search).get('templateId');

  const clearTemplateIdFromUrl = () => {
    history.replace({ pathname: location.pathname, search: '' });
  };

  useQuery({
    queryKey: ['ruleTemplate', templateId],
    queryFn: () => ruleTemplatesApi.getRuleTemplate(templateId!),
    enabled: Boolean(templateId),
    retry: false,
    refetchOnWindowFocus: false,
    onSuccess: (template) => {
      openCreateFromTemplateFlyout(template);
      clearTemplateIdFromUrl();
    },
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.hooks.useCreateFromTemplateQuery.errorMessage', {
          defaultMessage: 'Failed to load rule template',
        }),
      });
      clearTemplateIdFromUrl();
    },
  });
};
