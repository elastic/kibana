/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { RuleTemplatesApi } from '../services/rule_templates_api';

const TEMPLATE_LOAD_ERROR_TITLE = i18n.translate(
  'xpack.alertingV2.hooks.useCreateFromTemplateQuery.errorMessage',
  {
    defaultMessage: 'Failed to load rule template',
  }
);

/** Opens the create-rule flyout when the URL contains `templateId`. */
export const useCreateFromTemplateQuery = (
  openCreateFromTemplateFlyout: (template: RuleTemplateResponse) => void,
  { enabled = true }: { enabled?: boolean } = {}
): void => {
  const location = useLocation();
  const history = useHistory();
  const ruleTemplatesApi = useService(RuleTemplatesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const openFlyoutRef = useRef(openCreateFromTemplateFlyout);
  openFlyoutRef.current = openCreateFromTemplateFlyout;

  const templateId = new URLSearchParams(location.search).get('templateId');

  const query = useQuery({
    queryKey: ['ruleTemplate', templateId],
    queryFn: () => ruleTemplatesApi.getRuleTemplate(templateId!),
    enabled: enabled && Boolean(templateId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!enabled || !templateId) {
      return;
    }

    if (query.isSuccess && query.data) {
      openFlyoutRef.current(query.data);
      history.replace({ pathname: location.pathname, search: '' });
      return;
    }

    if (query.isError) {
      const error = query.error instanceof Error ? query.error : new Error(String(query.error));
      toasts.addError(error, { title: TEMPLATE_LOAD_ERROR_TITLE });
      history.replace({ pathname: location.pathname, search: '' });
    }
  }, [
    enabled,
    templateId,
    query.isSuccess,
    query.data,
    query.isError,
    query.error,
    history,
    location.pathname,
    toasts,
  ]);
};
