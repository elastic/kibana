/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlyoutAccordion } from '@kbn/flyout-sections';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { RuleSummaryRunbookCard } from './rule_summary_runbook_card';
import type { RuleSummarySectionProps } from '../types';

export const RuleSummaryInvestigationSection: React.FC<RuleSummarySectionProps> = ({ rule }) => {
  const hasRunbook = Boolean(rule.artifacts?.some((artifact) => artifact.type === 'runbook'));

  return (
    <FlyoutAccordion
      title={i18n.translate('xpack.alertingV2.ruleSummary.investigation', {
        defaultMessage: 'Investigation',
      })}
      hasBorder={false}
      initialIsOpen={hasRunbook}
      data-test-subj="ruleSummaryInvestigation"
    >
      <RuleSummaryRunbookCard rule={rule} />
    </FlyoutAccordion>
  );
};
