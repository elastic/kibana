/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';

export const RuleDoctorPage = () => {
  useBreadcrumbs('rule_doctor');

  return (
    <div>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="xpack.alertingV2.ruleDoctor.pageTitle"
            defaultMessage="Rule Doctor"
          />
        }
        description={
          <FormattedMessage
            id="xpack.alertingV2.ruleDoctor.pageDescription"
            defaultMessage="Analyze your rules for duplicates, stale conditions, threshold tuning opportunities, and coverage gaps."
          />
        }
      />
      <EuiSpacer size="l" />
      <EuiEmptyPrompt
        iconType="checkInCircleFilled"
        title={
          <h2>
            <FormattedMessage
              id="xpack.alertingV2.ruleDoctor.emptyTitle"
              defaultMessage="No insights yet"
            />
          </h2>
        }
        body={
          <FormattedMessage
            id="xpack.alertingV2.ruleDoctor.emptyBody"
            defaultMessage="Run an analysis to surface suggestions for improving your rules."
          />
        }
      />
    </div>
  );
};
