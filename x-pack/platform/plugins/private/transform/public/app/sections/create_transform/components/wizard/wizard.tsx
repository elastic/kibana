/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useEffect, useRef, useState, createContext, useMemo } from 'react';
import { pick } from 'lodash';

import type { EuiStepStatus } from '@elastic/eui';
import { EuiSteps } from '@elastic/eui';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import { FieldStatsFlyoutProvider } from '@kbn/ml-field-stats-flyout';

import { useEnabledFeatures } from '../../../../serverless_context';
import type { TransformConfigUnion } from '../../../../../../common/types/transform';
import { TRANSFORM_FUNCTION } from '../../../../../../common/constants';

import { getCreateTransformRequestBody } from '../../../../common';
import type { SearchItems } from '../../../../hooks/use_search_items';
import { useAppDependencies } from '../../../../app_dependencies';

import type { StepDefineExposedState } from '../step_define';
import {
  applyTransformConfigToDefineState,
  getDefaultStepDefineState,
  StepDefineForm,
  StepDefineSummary,
} from '../step_define';
import { getDefaultStepCreateState, StepCreateForm, StepCreateSummary } from '../step_create';
import {
  applyTransformConfigToDetailsState,
  getDefaultStepDetailsState,
  StepDetailsForm,
  StepDetailsSummary,
} from '../step_details';
import { WizardNav } from '../wizard_nav';
import { TransformFunctionSelector } from '../step_define/transform_function_selector';
import { SourceDataSelector } from '../step_define/source_data_selector';

import { TRANSFORM_STORAGE_KEYS } from './storage';

const styles = {
  steps: css`
    .euiStep__content {
      padding-right: 0;
    }
  `,
};

const localStorage = new Storage(window.localStorage);

enum WIZARD_STEPS {
  DEFINE,
  DETAILS,
  CREATE,
}

interface DefinePivotStepProps {
  isCurrentStep: boolean;
  stepDefineState: StepDefineExposedState;
  setCurrentStep: React.Dispatch<React.SetStateAction<WIZARD_STEPS>>;
  setStepDefineState: (s: StepDefineExposedState) => void;
  searchItems: SearchItems;
  onSelectSavedObjectId?: (savedObjectId: string) => void;
}

const StepDefine: FC<DefinePivotStepProps> = ({
  isCurrentStep,
  stepDefineState,
  setCurrentStep,
  setStepDefineState,
  searchItems,
  onSelectSavedObjectId,
}) => {
  const definePivotRef = useRef(null);

  return (
    <>
      <div ref={definePivotRef} />
      {isCurrentStep && (
        <>
          <StepDefineForm
            onChange={setStepDefineState}
            overrides={{ ...stepDefineState }}
            searchItems={searchItems}
            onSelectSavedObjectId={onSelectSavedObjectId}
          />
          <WizardNav
            next={() => setCurrentStep(WIZARD_STEPS.DETAILS)}
            nextActive={stepDefineState.valid}
          />
        </>
      )}
      {!isCurrentStep && (
        <StepDefineSummary formState={{ ...stepDefineState }} searchItems={searchItems} />
      )}
    </>
  );
};

interface WizardProps {
  cloneConfig?: TransformConfigUnion;
  searchItems?: SearchItems;
  onSelectSavedObjectId?: (savedObjectId: string) => void;
}

export const CreateTransformWizardContext = createContext<{
  dataView: DataView | null;
  runtimeMappings: RuntimeMappings | undefined;
}>({
  dataView: null,
  runtimeMappings: undefined,
});

export const Wizard: FC<WizardProps> = React.memo(
  ({ cloneConfig, searchItems, onSelectSavedObjectId }) => {
    const { showNodeInfo } = useEnabledFeatures();
    const appDependencies = useAppDependencies();
    const { uiSettings, data, fieldFormats, charts } = appDependencies;
    const dataView = searchItems?.dataView;
    const sourceId = searchItems?.savedSearch?.id ?? searchItems?.dataView?.id;

    // The current WIZARD_STEP
    const [currentStep, setCurrentStep] = useState(WIZARD_STEPS.DEFINE);

    const [pendingTransformFunction, setPendingTransformFunction] = useState<
      StepDefineExposedState['transformFunction']
    >(TRANSFORM_FUNCTION.PIVOT);

    // The DEFINE state
    const [stepDefineState, setStepDefineState] = useState<StepDefineExposedState | null>(null);
    const prevSourceId = useRef<string | undefined>(undefined);

    useEffect(() => {
      if (searchItems === undefined || dataView === undefined || stepDefineState !== null) {
        return;
      }

      const initialDefineState = applyTransformConfigToDefineState(
        getDefaultStepDefineState(searchItems),
        cloneConfig,
        dataView
      );

      setStepDefineState(
        cloneConfig
          ? initialDefineState
          : {
              ...initialDefineState,
              transformFunction: pendingTransformFunction,
            }
      );
    }, [cloneConfig, dataView, pendingTransformFunction, searchItems, stepDefineState]);

    useEffect(() => {
      if (sourceId === undefined) {
        prevSourceId.current = sourceId;
        return;
      }

      if (prevSourceId.current !== undefined && prevSourceId.current !== sourceId) {
        // When the source changes, keep as much as possible but ensure we stay on step 1.
        setCurrentStep(WIZARD_STEPS.DEFINE);

        // If the source is a Discover session, adopt its combined query for previews/config.
        if (searchItems?.savedSearch !== undefined) {
          setStepDefineState((prev) => {
            if (prev === null) return prev;
            return {
              ...prev,
              searchString: undefined,
              searchLanguage: prev.searchLanguage,
              searchQuery: searchItems.combinedQuery,
            };
          });
        }
      }

      prevSourceId.current = sourceId;
    }, [searchItems, sourceId]);

    // The DETAILS state
    const [stepDetailsState, setStepDetailsState] = useState(
      applyTransformConfigToDetailsState(getDefaultStepDetailsState(), cloneConfig)
    );

    // The CREATE state
    const [stepCreateState, setStepCreateState] = useState(getDefaultStepCreateState);

    const isWizardInitialized = dataView !== undefined && stepDefineState !== null;

    const transformConfig = useMemo(() => {
      if (!isWizardInitialized) {
        return null;
      }

      return getCreateTransformRequestBody(dataView!, stepDefineState, stepDetailsState);
    }, [dataView, isWizardInitialized, stepDefineState, stepDetailsState]);

    const stepDefine = useMemo(() => {
      return {
        title: i18n.translate('xpack.transform.transformsWizard.stepConfigurationTitle', {
          defaultMessage: 'Configuration',
        }),
        children: (
          <>
            {!isWizardInitialized && (
              <>
                <TransformFunctionSelector
                  selectedFunction={pendingTransformFunction}
                  onChange={setPendingTransformFunction}
                />

                <SourceDataSelector
                  searchItems={searchItems}
                  onSelectSavedObjectId={onSelectSavedObjectId}
                />
              </>
            )}

            {isWizardInitialized && searchItems !== undefined && (
              <StepDefine
                isCurrentStep={currentStep === WIZARD_STEPS.DEFINE}
                stepDefineState={stepDefineState}
                setCurrentStep={setCurrentStep}
                setStepDefineState={(s) => setStepDefineState(s)}
                searchItems={searchItems}
                onSelectSavedObjectId={onSelectSavedObjectId}
                key={sourceId}
              />
            )}
          </>
        ),
      };
    }, [
      currentStep,
      isWizardInitialized,
      onSelectSavedObjectId,
      pendingTransformFunction,
      searchItems,
      setCurrentStep,
      stepDefineState,
      sourceId,
    ]);

    const stepDetails = useMemo(() => {
      return {
        title: i18n.translate('xpack.transform.transformsWizard.stepDetailsTitle', {
          defaultMessage: 'Transform details',
        }),
        children: (
          <>
            {currentStep === WIZARD_STEPS.DETAILS &&
            isWizardInitialized &&
            searchItems !== undefined ? (
              <StepDetailsForm
                onChange={setStepDetailsState}
                overrides={stepDetailsState}
                searchItems={searchItems}
                stepDefineState={stepDefineState}
              />
            ) : (
              <StepDetailsSummary {...stepDetailsState} />
            )}
            {currentStep === WIZARD_STEPS.DETAILS && (
              <WizardNav
                previous={() => {
                  setCurrentStep(WIZARD_STEPS.DEFINE);
                }}
                next={() => setCurrentStep(WIZARD_STEPS.CREATE)}
                nextActive={isWizardInitialized ? stepDetailsState.valid : false}
              />
            )}
          </>
        ),
        status: currentStep >= WIZARD_STEPS.DETAILS ? undefined : ('incomplete' as EuiStepStatus),
      };
    }, [
      currentStep,
      isWizardInitialized,
      setStepDetailsState,
      stepDetailsState,
      searchItems,
      stepDefineState,
    ]);

    const stepCreate = useMemo(() => {
      return {
        title: i18n.translate('xpack.transform.transformsWizard.stepCreateTitle', {
          defaultMessage: 'Create',
        }),
        children: (
          <>
            {currentStep === WIZARD_STEPS.CREATE && transformConfig !== null ? (
              <StepCreateForm
                createDataView={stepDetailsState.createDataView}
                transformId={stepDetailsState.transformId}
                transformConfig={transformConfig}
                onChange={setStepCreateState}
                overrides={stepCreateState}
                timeFieldName={stepDetailsState.dataViewTimeField}
              />
            ) : (
              <StepCreateSummary />
            )}
            {currentStep === WIZARD_STEPS.CREATE && !stepCreateState.created && (
              <WizardNav previous={() => setCurrentStep(WIZARD_STEPS.DETAILS)} />
            )}
          </>
        ),
        status: currentStep >= WIZARD_STEPS.CREATE ? undefined : ('incomplete' as EuiStepStatus),
      };
    }, [
      currentStep,
      setCurrentStep,
      stepDetailsState.createDataView,
      stepDetailsState.transformId,
      transformConfig,
      setStepCreateState,
      stepCreateState,
      stepDetailsState.dataViewTimeField,
    ]);

    const stepsConfig = [stepDefine, stepDetails, stepCreate];

    const datePickerDeps: DatePickerDependencies = {
      ...pick(appDependencies, [
        'data',
        'http',
        'notifications',
        'theme',
        'uiSettings',
        'userProfile',
        'i18n',
      ]),
      uiSettingsKeys: UI_SETTINGS,
      showFrozenDataTierChoice: showNodeInfo,
    };

    const fieldStatsServices: FieldStatsServices = useMemo(
      () => ({
        uiSettings,
        dataViews: data.dataViews,
        data,
        fieldFormats,
        charts,
      }),
      [uiSettings, data, fieldFormats, charts]
    );

    const steps = <EuiSteps css={styles.steps} steps={stepsConfig} />;

    if (!isWizardInitialized || transformConfig === null) {
      return steps;
    }

    return (
      <FieldStatsFlyoutProvider
        dataView={dataView}
        fieldStatsServices={fieldStatsServices}
        timeRangeMs={stepDefineState.timeRangeMs}
        dslQuery={transformConfig.source.query}
      >
        <CreateTransformWizardContext.Provider
          value={{ dataView, runtimeMappings: stepDefineState.runtimeMappings }}
        >
          <UrlStateProvider>
            <StorageContextProvider storage={localStorage} storageKeys={TRANSFORM_STORAGE_KEYS}>
              <DatePickerContextProvider {...datePickerDeps}>{steps}</DatePickerContextProvider>
            </StorageContextProvider>
          </UrlStateProvider>
        </CreateTransformWizardContext.Provider>
      </FieldStatsFlyoutProvider>
    );
  }
);
