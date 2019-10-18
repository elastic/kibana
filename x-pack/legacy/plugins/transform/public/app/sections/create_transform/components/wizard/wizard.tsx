/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useContext, useRef, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiSteps, EuiStepStatus } from '@elastic/eui';

import { isKibanaContextInitialized, KibanaContext } from '../../../../lib/kibana';

import { getCreateRequestBody } from '../../../../common';

import {
  StepDefineExposedState,
  StepDefineForm,
  StepDefineSummary,
  getDefaultStepDefineState,
} from '../step_define';
import { getDefaultStepCreateState, StepCreateForm, StepCreateSummary } from '../step_create';
import { getDefaultStepDetailsState, StepDetailsForm, StepDetailsSummary } from '../step_details';
import { WizardNav } from '../wizard_nav';

enum WIZARD_STEPS {
  DEFINE,
  DETAILS,
  CREATE,
}

interface DefinePivotStepProps {
  isCurrentStep: boolean;
  stepDefineState: StepDefineExposedState;
  setCurrentStep: React.Dispatch<React.SetStateAction<WIZARD_STEPS>>;
  setStepDefineState: React.Dispatch<React.SetStateAction<StepDefineExposedState>>;
}

const StepDefine: SFC<DefinePivotStepProps> = ({
  isCurrentStep,
  stepDefineState,
  setCurrentStep,
  setStepDefineState,
}) => {
  const definePivotRef = useRef(null);

  return (
    <Fragment>
      <div ref={definePivotRef} />
      {isCurrentStep && (
        <Fragment>
          <StepDefineForm onChange={setStepDefineState} overrides={{ ...stepDefineState }} />
          <WizardNav
            next={() => setCurrentStep(WIZARD_STEPS.DETAILS)}
            nextActive={stepDefineState.valid}
          />
        </Fragment>
      )}
      {!isCurrentStep && <StepDefineSummary {...stepDefineState} />}
    </Fragment>
  );
};

export const Wizard: SFC = React.memo(() => {
  const kibanaContext = useContext(KibanaContext);

  // The current WIZARD_STEP
  const [currentStep, setCurrentStep] = useState(WIZARD_STEPS.DEFINE);

  // The DEFINE state
  const [stepDefineState, setStepDefineState] = useState(getDefaultStepDefineState(kibanaContext));

  // The DETAILS state
  const [stepDetailsState, setStepDetailsState] = useState(getDefaultStepDetailsState());

  const stepDetails =
    currentStep === WIZARD_STEPS.DETAILS ? (
      <StepDetailsForm onChange={setStepDetailsState} overrides={stepDetailsState} />
    ) : (
      <StepDetailsSummary {...stepDetailsState} />
    );

  // The CREATE state
  const [stepCreateState, setStepCreateState] = useState(getDefaultStepCreateState);

  if (!isKibanaContextInitialized(kibanaContext)) {
    // TODO proper loading indicator
    return null;
  }

  const indexPattern = kibanaContext.currentIndexPattern;

  const transformConfig = getCreateRequestBody(
    indexPattern.title,
    stepDefineState,
    stepDetailsState
  );

  const stepCreate =
    currentStep === WIZARD_STEPS.CREATE ? (
      <StepCreateForm
        createIndexPattern={stepDetailsState.createIndexPattern}
        transformId={stepDetailsState.transformId}
        transformConfig={transformConfig}
        onChange={setStepCreateState}
        overrides={stepCreateState}
      />
    ) : (
      <StepCreateSummary />
    );

  // scroll to the currently selected wizard step
  /*
  function scrollToRef() {
    if (definePivotRef !== null && definePivotRef.current !== null) {
      // TODO Fix types
      const dummy = definePivotRef as any;
      const headerOffset = 70;
      window.scrollTo(0, dummy.current.offsetTop - headerOffset);
    }
  }
  */

  const stepsConfig = [
    {
      title: i18n.translate('xpack.transform.transformsWizard.stepDefineTitle', {
        defaultMessage: 'Define pivot',
      }),
      children: (
        <StepDefine
          isCurrentStep={currentStep === WIZARD_STEPS.DEFINE}
          stepDefineState={stepDefineState}
          setCurrentStep={setCurrentStep}
          setStepDefineState={setStepDefineState}
        />
      ),
    },
    {
      title: i18n.translate('xpack.transform.transformsWizard.stepDetailsTitle', {
        defaultMessage: 'Transform details',
      }),
      children: (
        <Fragment>
          {stepDetails}
          {currentStep === WIZARD_STEPS.DETAILS && (
            <WizardNav
              previous={() => {
                setCurrentStep(WIZARD_STEPS.DEFINE);
                // scrollToRef();
              }}
              next={() => setCurrentStep(WIZARD_STEPS.CREATE)}
              nextActive={stepDetailsState.valid}
            />
          )}
        </Fragment>
      ),
      status: currentStep >= WIZARD_STEPS.DETAILS ? undefined : ('incomplete' as EuiStepStatus),
    },
    {
      title: i18n.translate('xpack.transform.transformsWizard.stepCreateTitle', {
        defaultMessage: 'Create',
      }),
      children: (
        <Fragment>
          {stepCreate}
          {currentStep === WIZARD_STEPS.CREATE && !stepCreateState.created && (
            <WizardNav previous={() => setCurrentStep(WIZARD_STEPS.DETAILS)} />
          )}
        </Fragment>
      ),
      status: currentStep >= WIZARD_STEPS.CREATE ? undefined : ('incomplete' as EuiStepStatus),
    },
  ];

  return <EuiSteps steps={stepsConfig} />;
});
