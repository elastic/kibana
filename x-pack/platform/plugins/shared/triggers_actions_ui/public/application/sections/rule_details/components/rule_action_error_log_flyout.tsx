/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiTitle,
  EuiButton,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiText,
  useIsWithinBreakpoints,
  EuiHorizontalRule,
  useEuiTheme,
} from '@elastic/eui';
import { IExecutionLog } from '@kbn/alerting-plugin/common';
import { RuleErrorLogWithApi } from './rule_error_log';
import { RuleActionErrorBadge } from './rule_action_error_badge';
import { RefreshToken } from './types';

export interface RuleActionErrorLogFlyoutProps {
  runLog: IExecutionLog;
  refreshToken?: RefreshToken;
  onClose: () => void;
  activeSpaceId?: string;
}

export const RuleActionErrorLogFlyout = (props: RuleActionErrorLogFlyoutProps) => {
  const { runLog, refreshToken, onClose, activeSpaceId } = props;

  const { euiTheme } = useEuiTheme();

  const {
    id,
    rule_id: ruleId,
    message,
    num_errored_actions: totalErrors,
    space_ids: spaceIds = [],
  } = runLog;

  const isFlyoutPush = useIsWithinBreakpoints(['xl']);

  const logFromDifferentSpace = useMemo(
    () => Boolean(activeSpaceId && !spaceIds?.includes(activeSpaceId)),
    [activeSpaceId, spaceIds]
  );

  return (
    <EuiFlyout
      type={isFlyoutPush ? 'push' : 'overlay'}
      onClose={onClose}
      size={isFlyoutPush ? 'm' : 'l'}
      data-test-subj="ruleActionErrorLogFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.ruleDetails.ruleActionErrorLogFlyout.actionErrors"
              defaultMessage="Errored Actions"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText
          size="xs"
          style={{
            fontWeight: euiTheme.font.weight.bold,
          }}
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.ruleDetails.ruleActionErrorLogFlyout.message"
            defaultMessage="Message"
          />
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiText data-test-subj="ruleActionErrorLogFlyoutMessageText">{message}</EuiText>
        <EuiHorizontalRule size="full" />
        <div>
          <RuleActionErrorBadge totalErrors={totalErrors} />
          &nbsp;
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.ruleDetails.ruleActionErrorLogFlyout.actionErrorsPlural"
            defaultMessage="{value, plural, one {errored action} other {errored actions}}"
            values={{
              value: totalErrors,
            }}
          />
        </div>
        <RuleErrorLogWithApi
          ruleId={ruleId}
          runId={id}
          spaceId={spaceIds[0]}
          logFromDifferentSpace={logFromDifferentSpace}
          refreshToken={refreshToken}
        />
        <EuiSpacer />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton data-test-subj="ruleActionErrorLogFlyoutCloseButton" onClick={onClose}>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.ruleDetails.ruleActionErrorLogFlyout.close"
            defaultMessage="Close"
          />
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
