/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const bannerSlideIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const bannerStyles = css`
  animation: ${bannerSlideIn} 200ms ease-out;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

interface Props {
  count: number;
  isLoading: boolean;
  onLoad: () => void;
}

export const NewEventsBanner = ({ count, isLoading, onLoad }: Props) => (
  <EuiCallOut
    css={bannerStyles}
    data-test-subj="executionHistoryNewEventsBanner"
    color="primary"
    iconType="bell"
    title={i18n.translate('xpack.alertingV2.executionHistory.newEventsBannerTitle', {
      defaultMessage:
        '{count, plural, one {# new event} other {# new events}} since the last refresh',
      values: { count },
    })}
  >
    <EuiButton
      size="s"
      color="primary"
      onClick={onLoad}
      isLoading={isLoading}
      isDisabled={isLoading}
      data-test-subj="executionHistoryLoadNewEventsButton"
    >
      <FormattedMessage
        id="xpack.alertingV2.executionHistory.newEventsBannerButton"
        defaultMessage="Load new events"
      />
    </EuiButton>
  </EuiCallOut>
);
