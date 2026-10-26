/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useState } from 'react';
import { css, keyframes } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import type { HypothesisTreeInput } from './build_hypothesis_graph';
import {
  OPEN_HYPOTHESIS_TREE_LABEL,
  hypothesesAnalyzedLabel,
  openHypothesisTreeAriaLabel,
} from './translations';

const LazyHypothesisTreeFlyout = React.lazy(async () => {
  const { HypothesisTreeFlyout } = await import('./hypothesis_tree_flyout');
  return { default: HypothesisTreeFlyout };
});

const DOT_SIZE = 3;

const dotPulse = keyframes`
  0%, 80%, 100% {
    opacity: 0.25;
  }
  40% {
    opacity: 1;
  }
`;

const TypingDots = (): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      aria-hidden={true}
      data-test-subj="investigationHypothesisTreeCardTypingDots"
      css={css`
        display: inline-flex;
        gap: 2px;
        margin-left: ${euiTheme.size.xs};
        vertical-align: middle;

        > span {
          width: ${DOT_SIZE}px;
          height: ${DOT_SIZE}px;
          border-radius: 50%;
          background: ${euiTheme.colors.textSubdued};
          animation: ${dotPulse} 1.2s ease-in-out infinite;
        }
        > span:nth-of-type(2) {
          animation-delay: 0.15s;
        }
        > span:nth-of-type(3) {
          animation-delay: 0.3s;
        }

        @media (prefers-reduced-motion: reduce) {
          > span {
            animation: none;
          }
        }
      `}
    >
      <span />
      <span />
      <span />
    </span>
  );
};

/**
 * Entry point to the hypothesis tree: how many hypotheses were analyzed, opening the tree in a
 * flyout stacked on the conversation details flyout. The tree reads `input` live, so it follows a
 * running investigation.
 */
export const HypothesisTreeCard = ({
  input,
}: {
  input: HypothesisTreeInput;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const description = hypothesesAnalyzedLabel(input.hypotheses.length);

  return (
    <>
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="m"
        onClick={() => setIsOpen(true)}
        aria-label={openHypothesisTreeAriaLabel(description)}
        data-test-subj="investigationHypothesisTreeButton"
      >
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <span
              css={css`
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: ${euiTheme.size.xl};
                height: ${euiTheme.size.xl};
                border-radius: ${euiTheme.border.radius.medium};
                background: ${euiTheme.colors.backgroundBaseAssistance};
              `}
            >
              <EuiIcon type="branch" color={euiTheme.colors.textAssistance} aria-hidden={true} />
            </span>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{OPEN_HYPOTHESIS_TREE_LABEL}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {description}
              {input.isRunning && <TypingDots />}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type="chevronSingleRight" color="subdued" aria-hidden={true} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {isOpen && (
        <Suspense fallback={null}>
          <LazyHypothesisTreeFlyout input={input} onClose={() => setIsOpen(false)} />
        </Suspense>
      )}
    </>
  );
};
