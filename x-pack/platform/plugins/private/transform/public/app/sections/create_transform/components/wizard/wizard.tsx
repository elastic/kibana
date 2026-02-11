/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  type FC,
  useCallback,
  useEffect,
  useRef,
  useState,
  createContext,
  useMemo,
} from 'react';
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

import { getCreateTransformRequestBody } from '../../../../common';
import { useSearchItems, type SearchItems } from '../../../../hooks/use_search_items';
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
import { StepSelectDataForm, StepSelectDataSummary } from '../step_select_data';
import { WizardNav } from '../wizard_nav';

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
  SELECT_DATA,
  DEFINE,
  DETAILS,
  CREATE,
}

interface SelectDataStepProps {
  isCurrentStep: boolean;
  isNextActive: boolean;
  searchItems: SearchItems | undefined;
  searchItemsError: string | undefined;
  setCurrentStep: React.Dispatch<React.SetStateAction<WIZARD_STEPS>>;
  onSavedObjectSelected: (id: string) => void;
}

const StepSelectData: FC<SelectDataStepProps> = ({
  isCurrentStep,
  isNextActive,
  searchItems,
  searchItemsError,
  setCurrentStep,
  onSavedObjectSelected,
}) => {
  return (
    <>
      {isCurrentStep ? (
        <>
          <StepSelectDataForm
            searchItemsError={searchItemsError}
            onSavedObjectSelected={onSavedObjectSelected}
          />
          <WizardNav next={() => setCurrentStep(WIZARD_STEPS.DEFINE)} nextActive={isNextActive} />
        </>
      ) : searchItems ? (
        <StepSelectDataSummary searchItems={searchItems} />
      ) : null}
    </>
  );
};

interface DefinePivotStepProps {
  isCurrentStep: boolean;
  stepDefineState: StepDefineExposedState;
  setCurrentStep: React.Dispatch<React.SetStateAction<WIZARD_STEPS>>;
  setStepDefineState: (next: StepDefineExposedState) => void;
  searchItems: SearchItems;
}

const StepDefine: FC<DefinePivotStepProps> = ({
  isCurrentStep,
  stepDefineState,
  setCurrentStep,
  setStepDefineState,
  searchItems,
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
          />
          <WizardNav
            previous={() => setCurrentStep(WIZARD_STEPS.SELECT_DATA)}
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
  defaultSavedObjectId?: string;
  onSavedObjectSelected?: (id: string) => void;
}

export const CreateTransformWizardContext = createContext<{
  dataView: DataView | null;
  runtimeMappings: RuntimeMappings | undefined;
}>({
  dataView: null,
  runtimeMappings: undefined,
});

const WizardProviders: FC<{
  dataView: DataView;
  runtimeMappings: RuntimeMappings | undefined;
  timeRangeMs: StepDefineExposedState['timeRangeMs'];
  dslQuery: Record<string, unknown> | undefined;
  children: React.ReactNode;
}> = ({ dataView, runtimeMappings, timeRangeMs, dslQuery, children }) => {
  const { showNodeInfo } = useEnabledFeatures();
  const appDependencies = useAppDependencies();

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

  const { uiSettings, data, fieldFormats, charts } = appDependencies;
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

  return (
    <FieldStatsFlyoutProvider
      dataView={dataView}
      fieldStatsServices={fieldStatsServices}
      timeRangeMs={timeRangeMs}
      dslQuery={dslQuery}
    >
      <CreateTransformWizardContext.Provider value={{ dataView, runtimeMappings }}>
        <UrlStateProvider>
          <StorageContextProvider storage={localStorage} storageKeys={TRANSFORM_STORAGE_KEYS}>
            <DatePickerContextProvider {...datePickerDeps}>{children}</DatePickerContextProvider>
          </StorageContextProvider>
        </UrlStateProvider>
      </CreateTransformWizardContext.Provider>
    </FieldStatsFlyoutProvider>
  );
};

export const Wizard: FC<WizardProps> = React.memo(
  ({
    cloneConfig,
    searchItems: providedSearchItems,
    defaultSavedObjectId,
    onSavedObjectSelected,
  }) => {
    const {
      searchItems: hookSearchItems,
      error: searchItemsError,
      setSavedObjectId,
    } = useSearchItems(defaultSavedObjectId);

    const searchItems = providedSearchItems ?? hookSearchItems;
    const dataView = searchItems?.dataView;

    // The current WIZARD_STEP
    const [currentStep, setCurrentStep] = useState<WIZARD_STEPS>(() =>
      providedSearchItems ? WIZARD_STEPS.DEFINE : WIZARD_STEPS.SELECT_DATA
    );

    useEffect(() => {
      if (providedSearchItems) return;
      if (defaultSavedObjectId !== undefined) {
        setSavedObjectId(defaultSavedObjectId);
      }
    }, [providedSearchItems, defaultSavedObjectId, setSavedObjectId]);

    const [stepDefineState, setStepDefineState] = useState<StepDefineExposedState | null>(() => {
      if (!searchItems || !dataView) return null;
      return applyTransformConfigToDefineState(
        getDefaultStepDefineState(searchItems),
        cloneConfig,
        dataView
      );
    });
    const setConcreteStepDefineState = useCallback(
      (next: StepDefineExposedState) => setStepDefineState(next),
      []
    );

    const [stepDetailsState, setStepDetailsState] = useState(() =>
      applyTransformConfigToDetailsState(getDefaultStepDetailsState(), cloneConfig)
    );

    const [stepCreateState, setStepCreateState] = useState(getDefaultStepCreateState);

    const selectedSourceKey = useMemo(() => {
      if (!searchItems) return undefined;
      return (
        searchItems.savedSearch?.id ??
        searchItems.dataView.id ??
        searchItems.dataView.getIndexPattern()
      );
    }, [searchItems]);

    const prevSelectedSourceKeyRef = useRef<string | undefined>(undefined);
    useEffect(() => {
      if (!searchItems || !dataView || selectedSourceKey === undefined) return;

      const hasChanged =
        prevSelectedSourceKeyRef.current !== undefined &&
        prevSelectedSourceKeyRef.current !== selectedSourceKey;

      prevSelectedSourceKeyRef.current = selectedSourceKey;

      setStepDefineState(
        applyTransformConfigToDefineState(
          getDefaultStepDefineState(searchItems),
          cloneConfig,
          dataView
        )
      );
      setStepDetailsState(
        applyTransformConfigToDetailsState(getDefaultStepDetailsState(), cloneConfig)
      );
      setStepCreateState(getDefaultStepCreateState());

      if (hasChanged) {
        setCurrentStep(WIZARD_STEPS.SELECT_DATA);
      }
    }, [searchItems, dataView, selectedSourceKey, cloneConfig]);

    const handleSavedObjectSelected = useCallback(
      (id: string) => {
        onSavedObjectSelected?.(id);
        setSavedObjectId(id);
      },
      [onSavedObjectSelected, setSavedObjectId]
    );

    const transformConfig = useMemo(() => {
      if (!dataView || !stepDefineState) return undefined;
      return getCreateTransformRequestBody(dataView, stepDefineState, stepDetailsState);
    }, [dataView, stepDefineState, stepDetailsState]);

    const stepSelectData = useMemo(() => {
      return {
        title: i18n.translate('xpack.transform.transformsWizard.stepSelectDataTitle', {
          defaultMessage: 'Select data source',
        }),
        children: (
          <StepSelectData
            isCurrentStep={currentStep === WIZARD_STEPS.SELECT_DATA}
            isNextActive={searchItems !== undefined}
            searchItems={searchItems}
            searchItemsError={searchItemsError}
            setCurrentStep={setCurrentStep}
            onSavedObjectSelected={handleSavedObjectSelected}
          />
        ),
      };
    }, [currentStep, searchItems, searchItemsError, handleSavedObjectSelected]);

    const stepDefine = useMemo(() => {
      return {
        title: i18n.translate('xpack.transform.transformsWizard.stepConfigurationTitle', {
          defaultMessage: 'Configuration',
        }),
        children:
          searchItems && stepDefineState ? (
            <StepDefine
              isCurrentStep={currentStep === WIZARD_STEPS.DEFINE}
              stepDefineState={stepDefineState}
              setCurrentStep={setCurrentStep}
              setStepDefineState={setConcreteStepDefineState}
              searchItems={searchItems}
            />
          ) : null,
        status: currentStep >= WIZARD_STEPS.DEFINE ? undefined : ('incomplete' as EuiStepStatus),
      };
    }, [currentStep, stepDefineState, searchItems, setConcreteStepDefineState]);

    const stepDetails = useMemo(() => {
      return {
        title: i18n.translate('xpack.transform.transformsWizard.stepDetailsTitle', {
          defaultMessage: 'Transform details',
        }),
        children:
          searchItems && stepDefineState ? (
            <>
              {currentStep === WIZARD_STEPS.DETAILS ? (
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
                  nextActive={stepDetailsState.valid}
                />
              )}
            </>
          ) : null,
        status: currentStep >= WIZARD_STEPS.DETAILS ? undefined : ('incomplete' as EuiStepStatus),
      };
    }, [currentStep, stepDetailsState, searchItems, stepDefineState]);

    const stepCreate = useMemo(() => {
      return {
        title: i18n.translate('xpack.transform.transformsWizard.stepCreateTitle', {
          defaultMessage: 'Create',
        }),
        children:
          searchItems && stepDefineState && transformConfig ? (
            <>
              {currentStep === WIZARD_STEPS.CREATE ? (
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
          ) : null,
        status: currentStep >= WIZARD_STEPS.CREATE ? undefined : ('incomplete' as EuiStepStatus),
      };
    }, [
      currentStep,
      stepDetailsState.createDataView,
      stepDetailsState.transformId,
      stepDetailsState.dataViewTimeField,
      searchItems,
      stepDefineState,
      stepCreateState,
      transformConfig,
    ]);

    const stepsConfig = [stepSelectData, stepDefine, stepDetails, stepCreate];

    if (!searchItems || !dataView || !stepDefineState || !transformConfig) {
      return <EuiSteps css={styles.steps} steps={stepsConfig} />;
    }

    return (
      <WizardProviders
        dataView={dataView}
        runtimeMappings={stepDefineState.runtimeMappings}
        timeRangeMs={stepDefineState.timeRangeMs}
        dslQuery={transformConfig.source.query}
      >
        <EuiSteps css={styles.steps} steps={stepsConfig} />
      </WizardProviders>
    );
  }
);
