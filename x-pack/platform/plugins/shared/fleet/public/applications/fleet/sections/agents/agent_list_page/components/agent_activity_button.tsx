/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiText, EuiTourStep } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { useDismissableTour } from '../../../../hooks';

export const AgentActivityButton: React.FC<{
  onClickAgentActivity: () => void;
  shouldShowTour?: boolean;
}> = ({ onClickAgentActivity, shouldShowTour = false }) => {
  const { isOpen, dismiss } = useDismissableTour('AGENT_ACTIVITY', shouldShowTour);

  return (
    <>
      <EuiTourStep
        content={
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentActivityButton.tourContent"
              defaultMessage="Review in progress, completed, and scheduled agent action activity history here anytime."
            />
          </EuiText>
        }
        isStepOpen={isOpen}
        onFinish={dismiss}
        minWidth={360}
        maxWidth={360}
        step={1}
        stepsTotal={1}
        title={
          <FormattedMessage
            id="xpack.fleet.agentActivityButton.tourTitle"
            defaultMessage="Agent activity history"
          />
        }
        anchorPosition="upCenter"
        footerAction={
          <EuiButtonEmpty onClick={dismiss}>
            <FormattedMessage
              id="xpack.fleet.genericTourPopover.dismissButton"
              defaultMessage="Got it"
            />
          </EuiButtonEmpty>
        }
        anchor="#agentActivityButton"
      />
      <EuiButtonEmpty
        onClick={() => {
          onClickAgentActivity();
        }}
        data-test-subj="agentActivityButton"
        iconType="clock"
        id="agentActivityButton"
      >
        <FormattedMessage
          id="xpack.fleet.agentList.agentActivityButton"
          defaultMessage="Agent activity"
        />
      </EuiButtonEmpty>
    </>
  );
};
