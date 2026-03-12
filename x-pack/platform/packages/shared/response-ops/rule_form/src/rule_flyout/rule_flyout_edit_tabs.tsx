/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiTabs, EuiTab, useEuiPaddingSize } from '@elastic/eui';
import type { EuiStepHorizontalProps } from '@elastic/eui/src/components/steps/step_horizontal';

interface RuleFlyoutEditTabsProps {
  steps: Array<Omit<EuiStepHorizontalProps, 'step'>>;
}

export const RuleFlyoutEditTabs = ({ steps }: RuleFlyoutEditTabsProps) => {
  const bottomMarginOffset = `-${useEuiPaddingSize('l')}`;

  const tabs = useMemo(
    () =>
      steps.map((step, index) => {
        return (
          <EuiTab key={index} isSelected={step.status === 'current'} onClick={step.onClick}>
            {step.title}
          </EuiTab>
        );
      }),
    [steps]
  );
  return (
    <div style={{ marginBottom: bottomMarginOffset }}>
      <EuiTabs bottomBorder={false}>{tabs}</EuiTabs>
    </div>
  );
};
