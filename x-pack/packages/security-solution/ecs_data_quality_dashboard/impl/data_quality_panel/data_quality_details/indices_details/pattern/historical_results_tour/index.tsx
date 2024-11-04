/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiText, EuiTourStep } from '@elastic/eui';
import styled from 'styled-components';

import { HISTORICAL_RESULTS_TOUR_SELECTOR_KEY } from '../constants';
import { CLOSE, INTRODUCING_DATA_QUALITY_HISTORY, TRY_IT, VIEW_PAST_RESULTS } from './translations';

export interface Props {
  anchorSelectorValue: string;
  isOpen: boolean;
  onTryIt: () => void;
  onDismissTour: () => void;
  zIndex?: number;
}

const StyledText = styled(EuiText)`
  margin-block-start: -10px;
`;

export const HistoricalResultsTour: FC<Props> = ({
  anchorSelectorValue,
  onTryIt,
  isOpen,
  onDismissTour,
  zIndex,
}) => {
  const [anchorElement, setAnchorElement] = useState<HTMLElement>();

  useEffect(() => {
    const element = document.querySelector<HTMLElement>(
      `[${HISTORICAL_RESULTS_TOUR_SELECTOR_KEY}="${anchorSelectorValue}"]`
    );

    if (!element) {
      return;
    }

    setAnchorElement(element);
  }, [anchorSelectorValue]);

  if (!isOpen || !anchorElement) {
    return null;
  }

  return (
    <EuiTourStep
      content={
        <StyledText size="s">
          <p>{VIEW_PAST_RESULTS}</p>
        </StyledText>
      }
      data-test-subj="historicalResultsTour"
      isStepOpen={isOpen}
      minWidth={283}
      onFinish={onDismissTour}
      step={1}
      stepsTotal={1}
      title={INTRODUCING_DATA_QUALITY_HISTORY}
      anchorPosition="rightUp"
      repositionOnScroll
      anchor={anchorElement}
      zIndex={zIndex}
      panelProps={{
        'data-test-subj': 'historicalResultsTourPanel',
      }}
      footerAction={[
        <EuiButtonEmpty size="xs" color="text" onClick={onDismissTour}>
          {CLOSE}
        </EuiButtonEmpty>,
        <EuiButton color="success" size="s" onClick={onTryIt}>
          {TRY_IT}
        </EuiButton>,
      ]}
    />
  );
};
