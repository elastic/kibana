/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { FlyoutAccordion, FlyoutSubsection } from '@kbn/flyout-sections';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { RuleConditions } from '../rule_conditions';
import { RuleSummaryAboutCard } from './rule_summary_about_card';
import type { RuleSummarySectionProps } from '../types';

export const RuleSummaryAboutSection: React.FC<RuleSummarySectionProps> = ({ rule }) => (
  <FlyoutAccordion
    title={i18n.translate('xpack.alertingV2.ruleSummary.about', {
      defaultMessage: 'About',
    })}
    hasBorder={false}
    initialIsOpen
    data-test-subj="ruleSummaryAbout"
  >
    <RuleSummaryAboutCard rule={rule} />
    <EuiSpacer size="m" />
    <FlyoutSubsection
      title={i18n.translate('xpack.alertingV2.ruleDetails.conditions', {
        defaultMessage: 'Rule conditions',
      })}
      hasBorder
    >
      <RuleConditions rule={rule} variant="summary" />
    </FlyoutSubsection>
  </FlyoutAccordion>
);
