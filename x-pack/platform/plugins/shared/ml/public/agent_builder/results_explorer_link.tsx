/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionButtonType, type ActionButton } from '@kbn/agent-builder-browser/attachments';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import type { DataFrameAnalysisConfigType } from '@kbn/ml-data-frame-analytics-utils';
import type { MlLocator } from '../locator';

const viewResultsLabel = i18n.translate('xpack.ml.agentBuilder.dfa.viewResults', {
  defaultMessage: 'View in analytics exploration',
});

/** App path for a data frame analytics results explorer page. */
export function resultsExplorerHref(
  locator: MlLocator | undefined,
  jobId: string,
  analysisType: DataFrameAnalysisConfigType | undefined
): string | undefined {
  if (!locator || !analysisType) {
    return undefined;
  }
  return locator.getRedirectUrl({
    page: ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
    pageState: { jobId, analysisType },
  });
}

/** Header action that opens the results explorer. */
export function resultsExplorerAction(href: string | undefined): ActionButton[] {
  if (!href) {
    return [];
  }
  return [
    {
      label: viewResultsLabel,
      icon: 'table',
      type: ActionButtonType.SECONDARY,
      href,
      handler: () => undefined,
    },
  ];
}

/** Job id that opens the results explorer when a locator path is available. */
export const AnalyticsJobLink = ({ jobId, href }: { jobId: string; href?: string }) => {
  const label = i18n.translate('xpack.ml.agentBuilder.dfa.analyticsJobLink', {
    defaultMessage: 'Analytics job {jobId}',
    values: { jobId },
  });
  if (!href) {
    return <span>{label}</span>;
  }
  return (
    <EuiLink href={href} data-test-subj="mlAgentBuilderAnalyticsJobLink">
      {label}
    </EuiLink>
  );
};
