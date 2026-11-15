/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AnimationEvent, FC, ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { css, keyframes } from '@emotion/react';
import { EuiButtonEmpty, EuiSpacer, useEuiTheme } from '@elastic/eui';

export interface SlidingPanelDetail {
  title: string;
  content: ReactNode;
}

interface Props {
  list: ReactNode;
  /** The panel which slides over the list, or nothing while the list is shown. */
  detail?: SlidingPanelDetail;
  onBack: () => void;
  /** For a panel whose title and back button are shown by the panel which contains it. */
  hideBack?: boolean;
  'data-test-subj'?: string;
}

type Transition = 'forward' | 'back';

// Fallback for an animation which never ends, e.g. when the panel isn't rendered.
const MAX_TRANSITION_MS = 600;

const slideInFromRight = keyframes({ from: { transform: 'translateX(100%)' }, to: {} });
const slideInFromLeft = keyframes({ from: { transform: 'translateX(-100%)' }, to: {} });
const slideOutToLeft = keyframes({ to: { transform: 'translateX(-100%)' } });
const slideOutToRight = keyframes({ to: { transform: 'translateX(100%)' } });

/**
 * Shows a list, and slides a detail panel over it and back. Unlike EuiContextMenu, whose
 * panels slide by a fixed distance, the panels slide by their own width, whatever it is.
 */
export const SlidingPanels: FC<Props> = ({
  list,
  detail,
  onBack,
  hideBack = false,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  const isDetailShown = detail !== undefined;

  // The detail stays rendered while it slides away, after the caller has let go of it.
  const [lastDetail, setLastDetail] = useState(detail);
  if (detail !== undefined && detail !== lastDetail) {
    setLastDetail(detail);
  }

  const [wasDetailShown, setWasDetailShown] = useState(isDetailShown);
  const [transition, setTransition] = useState<Transition>();
  if (isDetailShown !== wasDetailShown) {
    setWasDetailShown(isDetailShown);
    setTransition(isDetailShown ? 'forward' : 'back');
  }

  useEffect(() => {
    if (transition === undefined) return;
    const timeout = setTimeout(() => setTransition(undefined), MAX_TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [transition]);

  const slide = (animationName: ReturnType<typeof keyframes>, isOutgoing: boolean) => css`
    animation-name: ${animationName};
    animation-duration: ${euiTheme.animation.normal};
    animation-timing-function: ${euiTheme.animation.resistance};
    animation-fill-mode: forwards;
    pointer-events: none;
    @media (prefers-reduced-motion: reduce) {
      animation-duration: 0s;
    }
    ${isOutgoing ? 'position: absolute; inset-block-start: 0; inset-inline: 0;' : ''}
  `;

  const isListShown = !isDetailShown || transition === 'forward';
  const showsDetailPanel = isDetailShown || transition === 'back';
  const detailToShow = detail ?? lastDetail;

  // Animations of what is inside the panels bubble up, and aren't the end of the slide.
  const endTransition = ({ target, currentTarget }: AnimationEvent) => {
    if (target === currentTarget) setTransition(undefined);
  };

  return (
    <div
      css={css`
        position: relative;
        overflow-x: hidden;
      `}
      data-test-subj={dataTestSubj}
    >
      {isListShown && (
        <div
          css={
            transition === 'forward'
              ? slide(slideOutToLeft, true)
              : transition === 'back'
              ? slide(slideInFromLeft, false)
              : undefined
          }
          onAnimationEnd={endTransition}
        >
          {list}
        </div>
      )}
      {showsDetailPanel && detailToShow && (
        <div
          css={
            transition === 'forward'
              ? slide(slideInFromRight, false)
              : transition === 'back'
              ? slide(slideOutToRight, true)
              : undefined
          }
          onAnimationEnd={endTransition}
        >
          {!hideBack && (
            <>
              <EuiButtonEmpty
                iconType="chevronSingleLeft"
                flush="left"
                size="s"
                onClick={onBack}
                data-test-subj={dataTestSubj ? `${dataTestSubj}Back` : undefined}
              >
                <strong>{detailToShow.title}</strong>
              </EuiButtonEmpty>
              <EuiSpacer size="m" />
            </>
          )}
          {detailToShow.content}
        </div>
      )}
    </div>
  );
};
