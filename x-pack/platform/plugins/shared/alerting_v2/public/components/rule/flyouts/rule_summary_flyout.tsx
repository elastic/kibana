/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { paths } from '../../../constants';
import { RuleProvider } from '../../rule_details/rule_context';
import {
  RuleHeaderDescription,
  RuleTitleWithBadges,
} from '../../rule_details/rule_header_description';
import { RuleConditions } from '../../rule_details/sidebar/rule_conditions';
import { RuleMetadata } from '../../rule_details/sidebar/rule_metadata';
import type { RuleApiResponse } from '../../../services/rules_api';

const FLYOUT_TITLE_ID = 'ruleSummaryFlyoutTitle';

export interface RuleSummaryFlyoutProps {
  rule: RuleApiResponse;
  onClose: () => void;
}

export const RuleSummaryFlyout = ({ rule, onClose }: RuleSummaryFlyoutProps) => {
  const { basePath } = useService(CoreStart('http'));
  const detailsHref = basePath.prepend(paths.ruleDetails(rule.id));

  return (
    <EuiFlyout
      type="push"
      size="m"
      ownFocus
      onClose={onClose}
      aria-labelledby={FLYOUT_TITLE_ID}
      data-test-subj="ruleSummaryFlyout"
    >
      <RuleProvider rule={rule}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s" id={FLYOUT_TITLE_ID}>
            <h2 data-test-subj="ruleSummaryFlyoutTitle">
              <RuleTitleWithBadges />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <RuleHeaderDescription />
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <RuleConditions variant="summary" />
          <EuiHorizontalRule />
          <RuleMetadata />
        </EuiFlyoutBody>
      </RuleProvider>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="ruleSummaryFlyoutCancelButton">
              <FormattedMessage
                id="xpack.alertingV2.ruleSummaryFlyout.cancel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill href={detailsHref} data-test-subj="ruleSummaryFlyoutOpenDetailsButton">
              <FormattedMessage
                id="xpack.alertingV2.ruleSummaryFlyout.openDetails"
                defaultMessage="Open details"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
