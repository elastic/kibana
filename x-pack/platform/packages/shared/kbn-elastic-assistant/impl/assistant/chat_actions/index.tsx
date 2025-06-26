/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { SUBMIT_MESSAGE } from '../translations';

interface OwnProps {
  isDisabled: boolean;
  isLoading: boolean;
  promptValue?: string;
  onSendMessage: () => void;
}

type Props = OwnProps;
/**
 * Renders two EuiButtonIcon components with tooltips for clearing the chat and submitting a message,
 * while handling the disabled and loading states of the buttons.
 */
export const ChatActions: React.FC<Props> = ({
  isDisabled,
  isLoading,
  onSendMessage,
  promptValue,
}) => {
  const submitTooltipRef = useRef<EuiToolTip | null>(null);

  const closeTooltip = useCallback(() => {
    submitTooltipRef?.current?.hideToolTip();
  }, []);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiToolTip
          ref={submitTooltipRef}
          position="right"
          content={SUBMIT_MESSAGE}
          display="block"
          onMouseOut={closeTooltip}
        >
          <EuiButtonIcon
            aria-label={SUBMIT_MESSAGE}
            data-test-subj="submit-chat"
            color="primary"
            display={promptValue?.length ? 'fill' : 'base'}
            size={'m'}
            iconType={'kqlFunction'}
            isDisabled={isDisabled || !promptValue?.length}
            isLoading={isLoading}
            onClick={onSendMessage}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
