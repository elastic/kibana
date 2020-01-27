/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Redirect, useParams } from 'react-router-dom';

import { HeaderPage } from '../../../../components/header_page';
import { WrapperPage } from '../../../../components/wrapper_page';
import { SpyRoute } from '../../../../utils/route/spy_routes';
import { DETECTION_ENGINE_PAGE_NAME } from '../../../../components/link_to/redirect_to_detection_engine';
import { useRule, usePersistRule } from '../../../../containers/detection_engine/rules';
import { FormHook, FormData } from '../components/shared_imports';
import { StepPanel } from '../components/step_panel';
import { StepAboutRule } from '../components/step_about_rule';
import { StepDefineRule } from '../components/step_define_rule';
import { StepScheduleRule } from '../components/step_schedule_rule';
import { formatRule } from '../create/helpers';
import { getStepsData } from '../helpers';
import * as ruleI18n from '../translations';
import { RuleStep, DefineStepRule, AboutStepRule, ScheduleStepRule } from '../types';
import * as i18n from './translations';

interface StepRuleForm {
  isValid: boolean;
}
interface AboutStepRuleForm extends StepRuleForm {
  data: AboutStepRule | null;
}
interface DefineStepRuleForm extends StepRuleForm {
  data: DefineStepRule | null;
}
interface ScheduleStepRuleForm extends StepRuleForm {
  data: ScheduleStepRule | null;
}

export const EditRuleComponent = memo(() => {
  const { ruleId } = useParams();
  const [loading, rule] = useRule(ruleId);
  const [initForm, setInitForm] = useState(false);
  const [myAboutRuleForm, setMyAboutRuleForm] = useState<AboutStepRuleForm>({
    data: null,
    isValid: false,
  });
  const [myDefineRuleForm, setMyDefineRuleForm] = useState<DefineStepRuleForm>({
    data: null,
    isValid: false,
  });
  const [myScheduleRuleForm, setMyScheduleRuleForm] = useState<ScheduleStepRuleForm>({
    data: null,
    isValid: false,
  });
  const [selectedTab, setSelectedTab] = useState<EuiTabbedContentTab>();
  const stepsForm = useRef<Record<RuleStep, FormHook<FormData> | null>>({
    [RuleStep.defineRule]: null,
    [RuleStep.aboutRule]: null,
    [RuleStep.scheduleRule]: null,
  });
  const [{ isLoading, isSaved }, setRule] = usePersistRule();
  const [tabHasError, setTabHasError] = useState<RuleStep[]>([]);
  const setStepsForm = useCallback(
    (step: RuleStep, form: FormHook<FormData>) => {
      stepsForm.current[step] = form;
      if (initForm && step === (selectedTab?.id as RuleStep) && form.isSubmitted === false) {
        setInitForm(false);
        form.submit();
      }
    },
    [initForm, selectedTab]
  );
  const tabs = useMemo(
    () => [
      {
        id: RuleStep.defineRule,
        name: ruleI18n.DEFINITION,
        content: (
          <>
            <EuiSpacer />
            <StepPanel loading={loading} title={ruleI18n.DEFINITION}>
              {myDefineRuleForm.data != null && (
                <StepDefineRule
                  isReadOnlyView={false}
                  isLoading={isLoading}
                  isUpdateView
                  defaultValues={myDefineRuleForm.data}
                  setForm={setStepsForm}
                />
              )}
              <EuiSpacer />
            </StepPanel>
          </>
        ),
      },
      {
        id: RuleStep.aboutRule,
        name: ruleI18n.ABOUT,
        content: (
          <>
            <EuiSpacer />
            <StepPanel loading={loading} title={ruleI18n.ABOUT}>
              {myAboutRuleForm.data != null && (
                <StepAboutRule
                  isReadOnlyView={false}
                  isLoading={isLoading}
                  isUpdateView
                  defaultValues={myAboutRuleForm.data}
                  setForm={setStepsForm}
                />
              )}
              <EuiSpacer />
            </StepPanel>
          </>
        ),
      },
      {
        id: RuleStep.scheduleRule,
        name: ruleI18n.SCHEDULE,
        content: (
          <>
            <EuiSpacer />
            <StepPanel loading={loading} title={ruleI18n.SCHEDULE}>
              {myScheduleRuleForm.data != null && (
                <StepScheduleRule
                  isReadOnlyView={false}
                  isLoading={isLoading}
                  isUpdateView
                  defaultValues={myScheduleRuleForm.data}
                  setForm={setStepsForm}
                />
              )}
              <EuiSpacer />
            </StepPanel>
          </>
        ),
      },
    ],
    [
      loading,
      isLoading,
      myAboutRuleForm,
      myDefineRuleForm,
      myScheduleRuleForm,
      setStepsForm,
      stepsForm,
    ]
  );

  const onSubmit = useCallback(async () => {
    const activeFormId = selectedTab?.id as RuleStep;
    const activeForm = await stepsForm.current[activeFormId]?.submit();

    const invalidForms = [RuleStep.aboutRule, RuleStep.defineRule, RuleStep.scheduleRule].reduce<
      RuleStep[]
    >((acc, step) => {
      if (
        (step === activeFormId && activeForm != null && !activeForm?.isValid) ||
        (step === RuleStep.aboutRule && !myAboutRuleForm.isValid) ||
        (step === RuleStep.defineRule && !myDefineRuleForm.isValid) ||
        (step === RuleStep.scheduleRule && !myScheduleRuleForm.isValid)
      ) {
        return [...acc, step];
      }
      return acc;
    }, []);

    if (invalidForms.length === 0 && activeForm != null) {
      setTabHasError([]);
      setRule(
        formatRule(
          (activeFormId === RuleStep.defineRule
            ? activeForm.data
            : myDefineRuleForm.data) as DefineStepRule,
          (activeFormId === RuleStep.aboutRule
            ? activeForm.data
            : myAboutRuleForm.data) as AboutStepRule,
          (activeFormId === RuleStep.scheduleRule
            ? activeForm.data
            : myScheduleRuleForm.data) as ScheduleStepRule,
          ruleId
        )
      );
    } else {
      setTabHasError(invalidForms);
    }
  }, [stepsForm, myAboutRuleForm, myDefineRuleForm, myScheduleRuleForm, selectedTab, ruleId]);

  useEffect(() => {
    if (rule != null) {
      const { aboutRuleData, defineRuleData, scheduleRuleData } = getStepsData({ rule });
      setMyAboutRuleForm({ data: aboutRuleData, isValid: true });
      setMyDefineRuleForm({ data: defineRuleData, isValid: true });
      setMyScheduleRuleForm({ data: scheduleRuleData, isValid: true });
    }
  }, [rule]);

  const onTabClick = useCallback(
    async (tab: EuiTabbedContentTab) => {
      if (selectedTab != null) {
        const ruleStep = selectedTab.id as RuleStep;
        const respForm = await stepsForm.current[ruleStep]?.submit();
        if (respForm != null) {
          if (ruleStep === RuleStep.aboutRule) {
            setMyAboutRuleForm({
              data: respForm.data as AboutStepRule,
              isValid: respForm.isValid,
            });
          } else if (ruleStep === RuleStep.defineRule) {
            setMyDefineRuleForm({
              data: respForm.data as DefineStepRule,
              isValid: respForm.isValid,
            });
          } else if (ruleStep === RuleStep.scheduleRule) {
            setMyScheduleRuleForm({
              data: respForm.data as ScheduleStepRule,
              isValid: respForm.isValid,
            });
          }
        }
      }
      setInitForm(true);
      setSelectedTab(tab);
    },
    [selectedTab, stepsForm.current]
  );

  useEffect(() => {
    if (rule != null) {
      const { aboutRuleData, defineRuleData, scheduleRuleData } = getStepsData({ rule });
      setMyAboutRuleForm({ data: aboutRuleData, isValid: true });
      setMyDefineRuleForm({ data: defineRuleData, isValid: true });
      setMyScheduleRuleForm({ data: scheduleRuleData, isValid: true });
    }
  }, [rule]);

  useEffect(() => {
    setSelectedTab(tabs[0]);
  }, []);

  if (isSaved || (rule != null && rule.immutable)) {
    return <Redirect to={`/${DETECTION_ENGINE_PAGE_NAME}/rules/${ruleId}`} />;
  }

  return (
    <>
      <WrapperPage restrictWidth>
        <HeaderPage
          backOptions={{
            href: `#/${DETECTION_ENGINE_PAGE_NAME}/rules/${ruleId}`,
            text: `${i18n.BACK_TO} ${rule?.name ?? ''}`,
          }}
          isLoading={isLoading}
          title={i18n.PAGE_TITLE}
        />
        {tabHasError.length > 0 && (
          <EuiCallOut title={i18n.SORRY_ERRORS} color="danger" iconType="alert">
            <FormattedMessage
              id="xpack.siem.detectionEngine.rule.editRule.errorMsgDescription"
              defaultMessage="You have an invalid input in {countError, plural, one {this tab} other {these tabs}}: {tabHasError}"
              values={{
                countError: tabHasError.length,
                tabHasError: tabHasError
                  .map(t => {
                    if (t === RuleStep.aboutRule) {
                      return ruleI18n.ABOUT;
                    } else if (t === RuleStep.defineRule) {
                      return ruleI18n.DEFINITION;
                    } else if (t === RuleStep.scheduleRule) {
                      return ruleI18n.SCHEDULE;
                    }
                    return t;
                  })
                  .join(', '),
              }}
            />
          </EuiCallOut>
        )}

        <EuiTabbedContent
          initialSelectedTab={tabs[0]}
          selectedTab={tabs.find(t => t.id === selectedTab?.id)}
          onTabClick={onTabClick}
          tabs={tabs}
        />

        <EuiSpacer />

        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          justifyContent="flexEnd"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiButton iconType="cross" href={`#/${DETECTION_ENGINE_PAGE_NAME}/rules/${ruleId}`}>
              {i18n.CANCEL}
            </EuiButton>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={onSubmit} iconType="save" isLoading={isLoading}>
              {i18n.SAVE_CHANGES}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </WrapperPage>

      <SpyRoute />
    </>
  );
});
EditRuleComponent.displayName = 'EditRuleComponent';
