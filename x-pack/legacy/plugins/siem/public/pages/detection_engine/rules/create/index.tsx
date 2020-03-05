/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiAccordion, EuiHorizontalRule, EuiPanel, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useRef, useState } from 'react';
import { Redirect } from 'react-router-dom';
import styled, { StyledComponent } from 'styled-components';

import { usePersistRule } from '../../../../containers/detection_engine/rules';

import { DETECTION_ENGINE_PAGE_NAME } from '../../../../components/link_to/redirect_to_detection_engine';
import { WrapperPage } from '../../../../components/wrapper_page';
import { displaySuccessToast, useStateToaster } from '../../../../components/toasters';
import { SpyRoute } from '../../../../utils/route/spy_routes';
import { useUserInfo } from '../../components/user_info';
import { AccordionTitle } from '../components/accordion_title';
import { FormData, FormHook } from '../../../shared_imports';
import { StepAboutRule } from '../components/step_about_rule';
import { StepDefineRule } from '../components/step_define_rule';
import { StepScheduleRule } from '../components/step_schedule_rule';
import { DetectionEngineHeaderPage } from '../../components/detection_engine_header_page';
import * as RuleI18n from '../translations';
import { redirectToDetections } from '../helpers';
import { AboutStepRule, DefineStepRule, RuleStep, RuleStepData, ScheduleStepRule } from '../types';
import { formatRule } from './helpers';
import * as i18n from './translations';

const stepsRuleOrder = [RuleStep.defineRule, RuleStep.aboutRule, RuleStep.scheduleRule];

const MyEuiPanel = styled(EuiPanel)<{
  zindex?: number;
}>`
  position: relative;
  z-index: ${props => props.zindex}; /* ugly fix to allow searchBar to overflow the EuiPanel */

  > .euiAccordion > .euiAccordion__triggerWrapper {
    .euiAccordion__button {
      cursor: default !important;
      &:hover {
        text-decoration: none !important;
      }
    }

    .euiAccordion__iconWrapper {
      display: none;
    }
  }
`;

MyEuiPanel.displayName = 'MyEuiPanel';

const StepDefineRuleAccordion: StyledComponent<
  typeof EuiAccordion,
  any, // eslint-disable-line
  { ref: React.MutableRefObject<EuiAccordion | null> },
  never
> = styled(EuiAccordion)`
  .euiAccordion__childWrapper {
    overflow: visible;
  }
`;

StepDefineRuleAccordion.displayName = 'StepDefineRuleAccordion';

const CreateRulePageComponent: React.FC = () => {
  const {
    loading,
    isSignalIndexExists,
    isAuthenticated,
    hasEncryptionKey,
    canUserCRUD,
    hasManageApiKey,
  } = useUserInfo();
  const [, dispatchToaster] = useStateToaster();
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
  const userHasNoPermissions =
    canUserCRUD != null && hasManageApiKey != null ? !canUserCRUD || !hasManageApiKey : false;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const setStepData = useCallback(
    (step: RuleStep, data: unknown, isValid: boolean) => {
      stepsData.current[step] = { ...stepsData.current[step], data, isValid };
      if (isValid) {
        const stepRuleIdx = stepsRuleOrder.findIndex(item => step === item);
        if ([0, 1].includes(stepRuleIdx)) {
          if (isStepRuleInReadOnlyView[stepsRuleOrder[stepRuleIdx + 1]]) {
            setOpenAccordionId(stepsRuleOrder[stepRuleIdx + 1]);
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

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const setStepsForm = useCallback((step: RuleStep, form: FormHook<FormData>) => {
    stepsForm.current[step] = form;
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
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

  // eslint-disable-next-line react-hooks/rules-of-hooks
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

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const manageIsEditable = useCallback(
    async (id: RuleStep) => {
      const activeForm = await stepsForm.current[openAccordionId]?.submit();
      if (activeForm != null && activeForm?.isValid) {
        stepsData.current[openAccordionId] = {
          ...stepsData.current[openAccordionId],
          data: activeForm.data,
          isValid: activeForm.isValid,
        };
        setOpenAccordionId(id);
        setIsStepRuleInEditView({
          ...isStepRuleInReadOnlyView,
          [openAccordionId]: true,
          [id]: false,
        });
      }
    },
    [isStepRuleInReadOnlyView, openAccordionId]
  );

  if (isSaved) {
    const ruleName = (stepsData.current[RuleStep.aboutRule].data as AboutStepRule).name;
    displaySuccessToast(i18n.SUCCESSFULLY_CREATED_RULES(ruleName), dispatchToaster);
    return <Redirect to={`/${DETECTION_ENGINE_PAGE_NAME}/rules`} />;
  }

  if (redirectToDetections(isSignalIndexExists, isAuthenticated, hasEncryptionKey)) {
    return <Redirect to={`/${DETECTION_ENGINE_PAGE_NAME}`} />;
  } else if (userHasNoPermissions) {
    return <Redirect to={`/${DETECTION_ENGINE_PAGE_NAME}/rules`} />;
  }

  return (
    <>
      <WrapperPage restrictWidth>
        <DetectionEngineHeaderPage
          backOptions={{ href: '#detections/rules', text: i18n.BACK_TO_RULES }}
          border
          isLoading={isLoading || loading}
          title={i18n.PAGE_TITLE}
        />
        <MyEuiPanel zindex={3}>
          <StepDefineRuleAccordion
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
            <EuiHorizontalRule margin="m" />
            <StepDefineRule
              addPadding={true}
              defaultValues={
                (stepsData.current[RuleStep.defineRule].data as DefineStepRule) ?? null
              }
              isReadOnlyView={isStepRuleInReadOnlyView[RuleStep.defineRule]}
              isLoading={isLoading || loading}
              setForm={setStepsForm}
              setStepData={setStepData}
              descriptionDirection="row"
            />
          </StepDefineRuleAccordion>
        </MyEuiPanel>
        <EuiSpacer size="l" />
        <MyEuiPanel zindex={2}>
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
            <EuiHorizontalRule margin="m" />
            <StepAboutRule
              addPadding={true}
              defaultValues={(stepsData.current[RuleStep.aboutRule].data as AboutStepRule) ?? null}
              descriptionDirection="row"
              isReadOnlyView={isStepRuleInReadOnlyView[RuleStep.aboutRule]}
              isLoading={isLoading || loading}
              setForm={setStepsForm}
              setStepData={setStepData}
            />
          </EuiAccordion>
        </MyEuiPanel>
        <EuiSpacer size="l" />
        <MyEuiPanel zindex={1}>
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
            <EuiHorizontalRule margin="m" />
            <StepScheduleRule
              addPadding={true}
              defaultValues={
                (stepsData.current[RuleStep.scheduleRule].data as ScheduleStepRule) ?? null
              }
              descriptionDirection="row"
              isReadOnlyView={isStepRuleInReadOnlyView[RuleStep.scheduleRule]}
              isLoading={isLoading || loading}
              setForm={setStepsForm}
              setStepData={setStepData}
            />
          </EuiAccordion>
        </MyEuiPanel>
      </WrapperPage>

      <SpyRoute />
    </>
  );
};

export const CreateRulePage = React.memo(CreateRulePageComponent);
