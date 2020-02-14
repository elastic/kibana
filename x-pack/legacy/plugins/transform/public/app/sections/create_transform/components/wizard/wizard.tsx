/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useEffect, useRef, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiSteps, EuiStepStatus } from '@elastic/eui';

import { Dictionary } from '../../../../../../common/types/common';

import { useKibanaContext } from '../../../../lib/kibana';

import {
  getCreateRequestBody,
  PivotAggsConfig,
  PivotAggsConfigDict,
  PivotGroupByConfig,
  PivotGroupByConfigDict,
  TransformPivotConfig,
  PIVOT_SUPPORTED_AGGS,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from '../../../../common';

import {
  StepDefineExposedState,
  StepDefineForm,
  StepDefineSummary,
  getDefaultStepDefineState,
} from '../step_define';
import { getDefaultStepCreateState, StepCreateForm, StepCreateSummary } from '../step_create';
import { getDefaultStepDetailsState, StepDetailsForm, StepDetailsSummary } from '../step_details';
import { WizardNav } from '../wizard_nav';

enum KBN_MANAGEMENT_PAGE_CLASSNAME {
  DEFAULT_BODY = 'mgtPage__body',
  TRANSFORM_BODY_MODIFIER = 'mgtPage__body--transformWizard',
}

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

const StepDefine: FC<DefinePivotStepProps> = ({
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

interface WizardProps {
  transformConfig?: TransformPivotConfig;
}

export const Wizard: FC<WizardProps> = React.memo(
  ({ transformConfig: originalTransformConfig }) => {
    const kibanaContext = useKibanaContext();

    // The current WIZARD_STEP
    const [currentStep, setCurrentStep] = useState(WIZARD_STEPS.DEFINE);

    // The DEFINE state
    const originalStepDefineState = getDefaultStepDefineState(kibanaContext);
    if (originalTransformConfig !== undefined) {
      originalStepDefineState.aggList = Object.keys(
        originalTransformConfig.pivot.aggregations
      ).reduce((aggList, aggName) => {
        const aggConfig = originalTransformConfig.pivot.aggregations[aggName] as Dictionary<any>;
        const agg = Object.keys(aggConfig)[0];
        aggList[aggName] = {
          agg: agg as PIVOT_SUPPORTED_AGGS,
          aggName,
          dropDownName: aggName,
          ...aggConfig[agg],
        } as PivotAggsConfig;
        return aggList;
      }, {} as PivotAggsConfigDict);

      originalStepDefineState.groupByList = Object.keys(
        originalTransformConfig.pivot.group_by
      ).reduce((groupByList, groupByName) => {
        const groupByConfig = originalTransformConfig.pivot.group_by[groupByName] as Dictionary<
          any
        >;
        const groupBy = Object.keys(groupByConfig)[0];
        groupByList[groupByName] = {
          agg: groupBy as PIVOT_SUPPORTED_GROUP_BY_AGGS,
          aggName: groupByName,
          dropDownName: groupByName,
          ...groupByConfig[groupBy],
        } as PivotGroupByConfig;
        return groupByList;
      }, {} as PivotGroupByConfigDict);

      originalStepDefineState.valid = true;
    }
    const [stepDefineState, setStepDefineState] = useState(originalStepDefineState);

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

    useEffect(() => {
      // The transform plugin doesn't control the wrapping management page via React
      // so we use plain JS to add and remove a custom CSS class to set the full
      // page width to 100% for the transform wizard. It's done to replicate the layout
      // as it was when transforms were part of the ML plugin. This will be revisited
      // to come up with an approach that's more in line with the overall layout
      // of the Kibana management section.
      const managementBody = document.getElementsByClassName(
        KBN_MANAGEMENT_PAGE_CLASSNAME.DEFAULT_BODY
      );

      if (managementBody.length > 0) {
        managementBody[0].classList.add(KBN_MANAGEMENT_PAGE_CLASSNAME.TRANSFORM_BODY_MODIFIER);
        return () => {
          managementBody[0].classList.remove(KBN_MANAGEMENT_PAGE_CLASSNAME.TRANSFORM_BODY_MODIFIER);
        };
      }
    }, []);

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

    return <EuiSteps className="transform__steps" steps={stepsConfig} />;
  }
);
