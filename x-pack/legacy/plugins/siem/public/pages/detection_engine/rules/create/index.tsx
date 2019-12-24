/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiAccordion, EuiHorizontalRule, EuiPanel, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useRef, useState } from 'react';
import { Redirect } from 'react-router-dom';
import styled from 'styled-components';

import { HeaderPage } from '../../../../components/header_page';
import { DETECTION_ENGINE_PAGE_NAME } from '../../../../components/link_to/redirect_to_detection_engine';
import { WrapperPage } from '../../../../components/wrapper_page';
import { usePersistRule } from '../../../../containers/detection_engine/rules';
import { SpyRoute } from '../../../../utils/route/spy_routes';
import { AccordionTitle } from '../components/accordion_title';
import { FormData, FormHook } from '../components/shared_imports';
import { StepAboutRule } from '../components/step_about_rule';
import { StepDefineRule } from '../components/step_define_rule';
import { StepScheduleRule } from '../components/step_schedule_rule';
import * as RuleI18n from '../translations';
import { AboutStepRule, DefineStepRule, RuleStep, RuleStepData, ScheduleStepRule } from '../types';
import { formatRule } from './helpers';
import * as i18n from './translations';

const stepsRuleOrder = [RuleStep.defineRule, RuleStep.aboutRule, RuleStep.scheduleRule];

const ResizeEuiPanel = styled(EuiPanel)<{
  height?: number;
}>`
  .euiAccordion__iconWrapper {
    display: none;
  }
  .euiAccordion__childWrapper {
    height: ${props => (props.height !== -1 ? `${props.height}px !important` : 'auto')};
  }
`;

const MyEuiPanel = styled(EuiPanel)`
  .euiAccordion__iconWrapper {
    display: none;
  }
`;

export const CreateRuleComponent = React.memo(() => {
  const [heightAccordion, setHeightAccordion] = useState(-1);
  const [openAccordionId, setOpenAccordionId] = useState<RuleStep>(RuleStep.defineRule);
  const defineRuleRef = useRef<EuiAccordion | null>(null);
  const aboutRuleRef = useRef<EuiAccordion | null>(null);
  const scheduleRuleRef = useRef<EuiAccordion | null>(null);
  const stepsForm = useRef<Record<RuleStep, FormHook<FormData> | null>>({
    [RuleStep.defineRule]: null,
    [RuleStep.aboutRule]: null,
    [RuleStep.scheduleRule]: null,
  });
  const stepsData = useRef<Record<RuleStep, RuleStepData>>({
    [RuleStep.defineRule]: { isValid: false, data: {} },
    [RuleStep.aboutRule]: { isValid: false, data: {} },
    [RuleStep.scheduleRule]: { isValid: false, data: {} },
  });
  const [isStepRuleInReadOnlyView, setIsStepRuleInEditView] = useState<Record<RuleStep, boolean>>({
    [RuleStep.defineRule]: false,
    [RuleStep.aboutRule]: false,
    [RuleStep.scheduleRule]: false,
  });
  const [{ isLoading, isSaved }, setRule] = usePersistRule();

  const setStepData = useCallback(
    (step: RuleStep, data: unknown, isValid: boolean) => {
      stepsData.current[step] = { ...stepsData.current[step], data, isValid };
      if (isValid) {
        const stepRuleIdx = stepsRuleOrder.findIndex(item => step === item);
        if ([0, 1].includes(stepRuleIdx)) {
          if (isStepRuleInReadOnlyView[stepsRuleOrder[stepRuleIdx + 1]]) {
            setIsStepRuleInEditView({
              ...isStepRuleInReadOnlyView,
              [step]: true,
              [stepsRuleOrder[stepRuleIdx + 1]]: false,
            });
          } else if (openAccordionId !== stepsRuleOrder[stepRuleIdx + 1]) {
            setIsStepRuleInEditView({
              ...isStepRuleInReadOnlyView,
              [step]: true,
            });
            openCloseAccordion(stepsRuleOrder[stepRuleIdx + 1]);
            setOpenAccordionId(stepsRuleOrder[stepRuleIdx + 1]);
          }
        } else if (
          stepRuleIdx === 2 &&
          stepsData.current[RuleStep.defineRule].isValid &&
          stepsData.current[RuleStep.aboutRule].isValid
        ) {
          setRule(
            formatRule(
              stepsData.current[RuleStep.defineRule].data as DefineStepRule,
              stepsData.current[RuleStep.aboutRule].data as AboutStepRule,
              stepsData.current[RuleStep.scheduleRule].data as ScheduleStepRule
            )
          );
        }
      }
    },
    [isStepRuleInReadOnlyView, openAccordionId, stepsData.current, setRule]
  );

  const setStepsForm = useCallback((step: RuleStep, form: FormHook<FormData>) => {
    stepsForm.current[step] = form;
  }, []);

  const getAccordionType = useCallback(
    (accordionId: RuleStep) => {
      if (accordionId === openAccordionId) {
        return 'active';
      } else if (stepsData.current[accordionId].isValid) {
        return 'valid';
      }
      return 'passive';
    },
    [openAccordionId, stepsData.current]
  );

  const defineRuleButton = (
    <AccordionTitle
      name="1"
      title={RuleI18n.DEFINE_RULE}
      type={getAccordionType(RuleStep.defineRule)}
    />
  );

  const aboutRuleButton = (
    <AccordionTitle
      name="2"
      title={RuleI18n.ABOUT_RULE}
      type={getAccordionType(RuleStep.aboutRule)}
    />
  );

  const scheduleRuleButton = (
    <AccordionTitle
      name="3"
      title={RuleI18n.SCHEDULE_RULE}
      type={getAccordionType(RuleStep.scheduleRule)}
    />
  );

  const openCloseAccordion = (accordionId: RuleStep | null) => {
    if (accordionId != null) {
      if (accordionId === RuleStep.defineRule && defineRuleRef.current != null) {
        defineRuleRef.current.onToggle();
      } else if (accordionId === RuleStep.aboutRule && aboutRuleRef.current != null) {
        aboutRuleRef.current.onToggle();
      } else if (accordionId === RuleStep.scheduleRule && scheduleRuleRef.current != null) {
        scheduleRuleRef.current.onToggle();
      }
    }
  };

  const manageAccordions = useCallback(
    (id: RuleStep, isOpen: boolean) => {
      const activeRuleIdx = stepsRuleOrder.findIndex(step => step === openAccordionId);
      const stepRuleIdx = stepsRuleOrder.findIndex(step => step === id);

      if ((id === openAccordionId || stepRuleIdx < activeRuleIdx) && !isOpen) {
        openCloseAccordion(id);
      } else if (stepRuleIdx >= activeRuleIdx) {
        if (
          openAccordionId !== id &&
          !stepsData.current[openAccordionId].isValid &&
          !isStepRuleInReadOnlyView[id] &&
          isOpen
        ) {
          openCloseAccordion(id);
        }
      }
    },
    [isStepRuleInReadOnlyView, openAccordionId, stepsData]
  );

  const manageIsEditable = useCallback(
    async (id: RuleStep) => {
      const activeForm = await stepsForm.current[openAccordionId]?.submit();
      if (activeForm != null && activeForm?.isValid) {
        setOpenAccordionId(id);
        openCloseAccordion(openAccordionId);

        setIsStepRuleInEditView({
          ...isStepRuleInReadOnlyView,
          [openAccordionId]: openAccordionId === RuleStep.scheduleRule ? false : true,
          [id]: false,
        });
      }
    },
    [isStepRuleInReadOnlyView, openAccordionId]
  );

  if (isSaved) {
    return <Redirect to={`/${DETECTION_ENGINE_PAGE_NAME}/rules`} />;
  }

  return (
    <>
      <WrapperPage restrictWidth>
        <HeaderPage
          backOptions={{ href: '#detection-engine/rules', text: 'Back to rules' }}
          border
          isLoading={isLoading}
          title={i18n.PAGE_TITLE}
        />
        <ResizeEuiPanel height={heightAccordion}>
          <EuiAccordion
            initialIsOpen={true}
            id={RuleStep.defineRule}
            buttonContent={defineRuleButton}
            paddingSize="xs"
            ref={defineRuleRef}
            onToggle={manageAccordions.bind(null, RuleStep.defineRule)}
            extraAction={
              stepsData.current[RuleStep.defineRule].isValid && (
                <EuiButtonEmpty
                  iconType="pencil"
                  size="xs"
                  onClick={manageIsEditable.bind(null, RuleStep.defineRule)}
                >
                  {i18n.EDIT_RULE}
                </EuiButtonEmpty>
              )
            }
          >
            <EuiHorizontalRule margin="xs" />
            <StepDefineRule
              isReadOnlyView={isStepRuleInReadOnlyView[RuleStep.defineRule]}
              isLoading={isLoading}
              setForm={setStepsForm}
              setStepData={setStepData}
              resizeParentContainer={height => setHeightAccordion(height)}
            />
          </EuiAccordion>
        </ResizeEuiPanel>
        <EuiSpacer size="s" />
        <MyEuiPanel>
          <EuiAccordion
            initialIsOpen={false}
            id={RuleStep.aboutRule}
            buttonContent={aboutRuleButton}
            paddingSize="xs"
            ref={aboutRuleRef}
            onToggle={manageAccordions.bind(null, RuleStep.aboutRule)}
            extraAction={
              stepsData.current[RuleStep.aboutRule].isValid && (
                <EuiButtonEmpty
                  iconType="pencil"
                  size="xs"
                  onClick={manageIsEditable.bind(null, RuleStep.aboutRule)}
                >
                  {i18n.EDIT_RULE}
                </EuiButtonEmpty>
              )
            }
          >
            <EuiHorizontalRule margin="xs" />
            <StepAboutRule
              isReadOnlyView={isStepRuleInReadOnlyView[RuleStep.aboutRule]}
              isLoading={isLoading}
              setForm={setStepsForm}
              setStepData={setStepData}
            />
          </EuiAccordion>
        </MyEuiPanel>
        <EuiSpacer size="s" />
        <MyEuiPanel>
          <EuiAccordion
            initialIsOpen={false}
            id={RuleStep.scheduleRule}
            buttonContent={scheduleRuleButton}
            paddingSize="xs"
            ref={scheduleRuleRef}
            onToggle={manageAccordions.bind(null, RuleStep.scheduleRule)}
            extraAction={
              stepsData.current[RuleStep.scheduleRule].isValid && (
                <EuiButtonEmpty
                  iconType="pencil"
                  size="xs"
                  onClick={manageIsEditable.bind(null, RuleStep.scheduleRule)}
                >
                  {i18n.EDIT_RULE}
                </EuiButtonEmpty>
              )
            }
          >
            <EuiHorizontalRule margin="xs" />
            <StepScheduleRule
              isReadOnlyView={isStepRuleInReadOnlyView[RuleStep.scheduleRule]}
              isLoading={isLoading}
              setForm={setStepsForm}
              setStepData={setStepData}
            />
          </EuiAccordion>
        </MyEuiPanel>
      </WrapperPage>

      <SpyRoute />
    </>
  );
});
CreateRuleComponent.displayName = 'CreateRuleComponent';
