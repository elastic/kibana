/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement, useEffect, useState } from 'react';
import { EuiButtonEmpty, EuiText, EuiTourStep, EuiTourStepProps } from '@elastic/eui';
import { css } from '@emotion/react';

export interface TourCalloutProps
  extends Pick<
    EuiTourStepProps,
    | 'title'
    | 'content'
    | 'step'
    | 'stepsTotal'
    | 'anchorPosition'
    | 'minWidth'
    | 'maxWidth'
    | 'footerAction'
    | 'hasArrow'
    | 'subtitle'
    | 'maxWidth'
  > {
  children: ReactElement;
  isOpen?: boolean;
  footerButtonLabel: string;
  zIndex?: number;
  dismissTour?: () => void;
}

export const TourCallout = ({
  title,
  content,
  step,
  stepsTotal,
  anchorPosition,
  children,
  isOpen = true,
  hasArrow = true,
  subtitle,
  maxWidth = 350,
  footerButtonLabel,
  zIndex,
  dismissTour,
  ...rest
}: TourCalloutProps) => {
  const [isStepOpen, setIsStepOpen] = useState<boolean>(false);

  const handleFinish = () => {
    setIsStepOpen(false);
    if (dismissTour) {
      dismissTour();
    }
  };

  useEffect(() => {
    let timeoutId: any;

    if (isOpen) {
      timeoutId = setTimeout(() => {
        setIsStepOpen(true);
      }, 250);
    } else {
      setIsStepOpen(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isOpen]);

  return (
    <EuiTourStep
      title={title}
      subtitle={subtitle}
      content={
        <EuiText
          size="m"
          css={css`
            line-height: 1.5;
          `}
        >
          {content}
        </EuiText>
      }
      step={step}
      stepsTotal={stepsTotal}
      anchorPosition={anchorPosition}
      repositionOnScroll={true}
      isStepOpen={isStepOpen}
      onFinish={handleFinish}
      hasArrow={hasArrow}
      maxWidth={maxWidth}
      zIndex={zIndex}
      footerAction={
        <EuiButtonEmpty size="s" color="text" onClick={handleFinish}>
          {footerButtonLabel}
        </EuiButtonEmpty>
      }
      {...rest}
    >
      {children}
    </EuiTourStep>
  );
};
