/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement, useEffect, useState } from 'react';
import { EuiButtonEmpty, EuiTourStep, EuiTourStepProps } from '@elastic/eui';

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
  maxWidth = 330,
  footerButtonLabel,
  ...rest
}: TourCalloutProps) => {
  const [isStepOpen, setIsStepOpen] = useState<boolean>(false);

  const handleFinish = () => {
    setIsStepOpen(false);
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
      content={content}
      step={step}
      stepsTotal={stepsTotal}
      anchorPosition={anchorPosition}
      isStepOpen={isStepOpen}
      onFinish={handleFinish}
      hasArrow={hasArrow}
      maxWidth={maxWidth}
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
