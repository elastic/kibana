/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useRef } from 'react';

import { EuiSpacer } from '@elastic/eui';

import type { TransformFunction } from '../../../../../../common/constants';
import type { SearchItems } from '../../../../hooks/use_search_items';
import type { StepDefineExposedState } from '../step_define';
import { EmptyStepDefineForm, StepDefineForm, StepDefineSummary } from '../step_define';
import { WizardNav } from '../wizard_nav';

interface StepDefineProps {
  dataViewPicker: JSX.Element;
  initialTransformFunction: TransformFunction;
  isCurrentStep: boolean;
  onNext: () => void;
  stepDefineState?: StepDefineExposedState;
  setStepDefineState: React.Dispatch<React.SetStateAction<StepDefineExposedState | undefined>>;
  searchItems?: SearchItems;
}

// Renders the Configuration step in both states: an empty shell before data view selection,
// and the full data view-backed form once field metadata is available.
export const StepDefine: FC<StepDefineProps> = ({
  dataViewPicker,
  initialTransformFunction,
  isCurrentStep,
  onNext,
  stepDefineState,
  setStepDefineState,
  searchItems,
}) => {
  const definePivotRef = useRef(null);

  return (
    <>
      <div ref={definePivotRef} />
      {isCurrentStep && (
        <>
          {searchItems && stepDefineState ? (
            <StepDefineForm
              key={searchItems.dataView.id ?? searchItems.dataView.getIndexPattern()}
              dataViewPicker={dataViewPicker}
              onChange={setStepDefineState}
              overrides={{ ...stepDefineState }}
              searchItems={searchItems}
            />
          ) : (
            <EmptyStepDefineForm
              dataViewPicker={dataViewPicker}
              transformFunction={stepDefineState?.transformFunction ?? initialTransformFunction}
            />
          )}
          <EuiSpacer size="m" />
          <WizardNav next={onNext} nextActive={Boolean(searchItems && stepDefineState?.valid)} />
        </>
      )}
      {!isCurrentStep && searchItems && stepDefineState && (
        <StepDefineSummary formState={{ ...stepDefineState }} searchItems={searchItems} />
      )}
    </>
  );
};
