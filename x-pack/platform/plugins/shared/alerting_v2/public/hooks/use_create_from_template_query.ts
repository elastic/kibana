/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { History } from 'history';
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

/** Removes `templateId` and leaves the rest of the query string in place. */
const stripTemplateId = (history: History, pathname: string, search: string): void => {
  const params = new URLSearchParams(search);
  if (!params.has('templateId')) {
    return;
  }
  params.delete('templateId');
  const nextSearch = params.toString();
  history.replace({ pathname, search: nextSearch ? `?${nextSearch}` : '' });
};

/** Opens the create-rule flyout when the URL contains `templateId`. */
export const useCreateFromTemplateQuery = (
  openCreateFromTemplateFlyout: (template: RuleTemplateResponse) => void,
  { enabled = true }: { enabled?: boolean } = {}
): void => {
  const { pathname, search } = useLocation();
  const history = useHistory();
  const ruleTemplatesApi = useService(RuleTemplatesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const openFlyoutRef = useRef(openCreateFromTemplateFlyout);
  openFlyoutRef.current = openCreateFromTemplateFlyout;
  const handledTemplateIdRef = useRef<string | null>(null);

  const templateId = new URLSearchParams(search).get('templateId');

  const query = useQuery({
    queryKey: ['ruleTemplate', templateId],
    queryFn: () => ruleTemplatesApi.getRuleTemplate(templateId!),
    enabled: enabled && Boolean(templateId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!templateId) {
      handledTemplateIdRef.current = null;
      return;
    }

    if (!enabled || handledTemplateIdRef.current === templateId) {
      return;
    }

    if (query.isSuccess && query.data) {
      handledTemplateIdRef.current = templateId;
      openFlyoutRef.current(query.data);
      stripTemplateId(history, pathname, search);
      return;
    }

    if (query.isError) {
      handledTemplateIdRef.current = templateId;
      const error = query.error instanceof Error ? query.error : new Error(String(query.error));
      toasts.addError(error, { title: TEMPLATE_LOAD_ERROR_TITLE });
      stripTemplateId(history, pathname, search);
    }
  }, [
    enabled,
    templateId,
    query.isSuccess,
    query.data,
    query.isError,
    query.error,
    history,
    pathname,
    search,
    toasts,
  ]);
};
