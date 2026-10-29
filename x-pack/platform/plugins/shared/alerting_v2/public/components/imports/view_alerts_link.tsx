/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiLink } from '@elastic/eui';
import { ALERTING_V2_EPISODES_STATUS_ALL } from '@kbn/alerting-v2-constants';
import { useAlertingLocators } from '../../application/locator_context';

interface ViewAlertsProps {
  importId: string;
  children: ReactNode;
  'data-test-subj'?: string;
}

/**
 * POC: imported alerts carry the import id as `rule.id`, so the alerts list is filtered by rule.
 * The link opens the alerts list inside the same app instead of reloading the page.
 */
const useViewAlertsTarget = (importId: string) => {
  const { episodesLocators } = useAlertingLocators();
  const href = episodesLocators.useUrl(
    { filters: { ruleId: importId, status: ALERTING_V2_EPISODES_STATUS_ALL } },
    undefined,
    [importId]
  );
  const navigate = (event: React.MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    episodesLocators.navigateSync({
      filters: { ruleId: importId, status: ALERTING_V2_EPISODES_STATUS_ALL },
    });
  };
  return { href, navigate };
};

export const ViewAlertsLink = ({
  importId,
  children,
  'data-test-subj': dataTestSubj = 'importsViewAlertsLink',
}: ViewAlertsProps) => {
  const { href, navigate } = useViewAlertsTarget(importId);
  return (
    <EuiLink href={href} onClick={navigate} data-test-subj={dataTestSubj}>
      {children}
    </EuiLink>
  );
};
