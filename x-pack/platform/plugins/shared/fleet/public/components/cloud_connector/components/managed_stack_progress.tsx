/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProgress, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';

import type { ManagedStackState } from '../hooks/use_managed_stack';

interface ManagedStackProgressProps {
  state: ManagedStackState;
  /** Verb for the in-progress copy: creating or updating. */
  action: 'create' | 'update';
  onRetry?: () => void;
}

/**
 * Progress and failure feedback for a Kibana-managed CloudFormation stack operation.
 * `state.error` is a sanitized, length-capped plain string (see use_managed_stack.ts) rendered as
 * text only — never as markup.
 */
export const ManagedStackProgress: React.FC<ManagedStackProgressProps> = ({
  state,
  action,
  onRetry,
}) => {
  if (state.phase === 'idle' || state.phase === 'complete') {
    return null;
  }

  if (state.phase === 'failed') {
    return (
      <>
        <EuiSpacer size="m" />
        <KbnDangerCallout
          announceOnMount
          size="m"
          data-test-subj="managedStackProgress-failed"
          title={
            action === 'create' ? (
              <FormattedMessage
                id="xpack.fleet.cloudConnector.managedStack.createFailedTitle"
                defaultMessage="CloudFormation stack creation failed"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.cloudConnector.managedStack.updateFailedTitle"
                defaultMessage="CloudFormation stack update failed"
              />
            )
          }
          text={
            <EuiText size="s" data-test-subj="managedStackProgress-error">
              {state.error ?? ''}
            </EuiText>
          }
          {...(onRetry
            ? {
                actionProps: {
                  primary: {
                    onClick: onRetry,
                    'data-test-subj': 'managedStackProgress-retry',
                    children: (
                      <FormattedMessage
                        id="xpack.fleet.cloudConnector.managedStack.retryButton"
                        defaultMessage="Retry"
                      />
                    ),
                  },
                },
              }
            : {})}
        />
      </>
    );
  }

  return (
    <>
      <EuiSpacer size="m" />
      <KbnInfoCallout
        size="m"
        data-test-subj="managedStackProgress-running"
        title={
          action === 'create' ? (
            <FormattedMessage
              id="xpack.fleet.cloudConnector.managedStack.creatingTitle"
              defaultMessage="Creating the CloudFormation stack in your AWS account"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.cloudConnector.managedStack.updatingTitle"
              defaultMessage="Updating the CloudFormation stack in your AWS account"
            />
          )
        }
        text={
          <>
            <p>
              <FormattedMessage
                id="xpack.fleet.cloudConnector.managedStack.runningBody"
                defaultMessage="Kibana is waiting for CloudFormation to finish. This usually takes two to five minutes; you can leave this page open.{status}"
                values={{ status: state.stackStatus ? ` (${state.stackStatus})` : '' }}
              />
            </p>
            <EuiProgress size="xs" color="primary" />
          </>
        }
      />
    </>
  );
};
