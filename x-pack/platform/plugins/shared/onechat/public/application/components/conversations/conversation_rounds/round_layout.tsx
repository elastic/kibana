/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { RoundInput } from './round_input';

interface RoundLayoutProps {
  input: string;
  outputIcon: ReactNode;
  output: ReactNode;
  isResponseLoading: boolean;
  isCurrentRound: boolean;
  scrollContainerHeight: number;
}

const labels = {
  container: i18n.translate('xpack.onechat.round.container', {
    defaultMessage: 'Conversation round',
  }),
};

export const RoundLayout: React.FC<RoundLayoutProps> = ({
  input,
  outputIcon,
  output,
  isResponseLoading,
  isCurrentRound,
  scrollContainerHeight,
}) => {
  const [roundContainerMinHeight, setRoundContainerMinHeight] = useState(0);

  useEffect(() => {
    if (isCurrentRound && isResponseLoading) {
      setRoundContainerMinHeight(scrollContainerHeight);
    } else if (!isCurrentRound) {
      setRoundContainerMinHeight(0);
    }
  }, [isCurrentRound, isResponseLoading, scrollContainerHeight]);

  const roundContainerStyles = css`
    ${roundContainerMinHeight > 0 ? `min-height: ${roundContainerMinHeight}px;` : ''}
  `;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="l"
      aria-label={labels.container}
      css={roundContainerStyles}
    >
      <EuiFlexItem grow={false}>
        <RoundInput input={input} />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {/* <EuiFlexItem grow={false}>{outputIcon}</EuiFlexItem> */}
        <EuiFlexItem>{output}</EuiFlexItem>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
