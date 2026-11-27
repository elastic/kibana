/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiSkeletonText } from '@elastic/eui';
import type { FlyoutFooterMenuPanel } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';

/*
 * The footer drops a menu with no panels, so a flyout without a rule passes this placeholder
 * and disables the button instead, keeping the footer in place.
 */
export const DISABLED_TAKE_ACTION_PANELS: FlyoutFooterMenuPanel[] = [{ id: 0, items: [] }];

/** Constant flyout menu title, so the registration stays stable while the header title loads. */
export const RULE_SUMMARY_FLYOUT_TITLE = i18n.translate(
  'xpack.alertingV2.rule.summaryFlyout.title',
  { defaultMessage: 'Rule summary' }
);

const LOADING_LABEL = i18n.translate('xpack.alertingV2.rule.summaryFlyout.loading', {
  defaultMessage: 'Loading rule',
});

/** Body content shown inside a rule summary flyout while the rule is fetched. */
export const RuleSummaryLoadingBody = () => (
  <div role="progressbar" aria-label={LOADING_LABEL} data-test-subj="ruleSummaryFlyoutLoading">
    <EuiSkeletonText lines={6} />
  </div>
);

/** Body content shown inside a rule summary flyout when the rule failed to load or is missing. */
export const RuleSummaryNotFoundBody = () => (
  <EuiEmptyPrompt
    iconType="warning"
    color="warning"
    title={
      <h3>
        {i18n.translate('xpack.alertingV2.rule.summaryFlyout.notFoundTitle', {
          defaultMessage: 'Rule not found',
        })}
      </h3>
    }
    body={
      <p>
        {i18n.translate('xpack.alertingV2.rule.summaryFlyout.notFoundBody', {
          defaultMessage: 'The rule may have been deleted or you may not have access to it.',
        })}
      </p>
    }
    data-test-subj="ruleSummaryFlyoutNotFound"
  />
);
