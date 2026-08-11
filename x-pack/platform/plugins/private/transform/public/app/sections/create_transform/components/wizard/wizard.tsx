/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { pick } from 'lodash';

import type { EuiStepStatus } from '@elastic/eui';
import {
  EuiConfirmModal,
  EuiFormRow,
  EuiSteps,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/public';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import { FieldStatsFlyoutProvider } from '@kbn/ml-field-stats-flyout';
import { DataViewPicker } from '@kbn/unified-search-plugin/public';

import { useEnabledFeatures } from '../../../../serverless_context';
import { TRANSFORM_FUNCTION, type TransformFunction } from '../../../../../../common/constants';
import type { TransformConfigUnion } from '../../../../../../common/types/transform';
import { isLatestTransform } from '../../../../../../common/types/transform';

import { getCreateTransformRequestBody } from '../../../../common';
import type { SearchItems } from '../../../../hooks/use_search_items';
import { useAppDependencies } from '../../../../app_dependencies';

import type { StepDefineExposedState } from '../step_define';
import { applyTransformConfigToDefineState, getDefaultStepDefineState } from '../step_define';
import { getDefaultStepCreateState, StepCreateForm, StepCreateSummary } from '../step_create';
import {
  applyTransformConfigToDetailsState,
  getDefaultStepDetailsState,
  StepDetailsForm,
  StepDetailsSummary,
} from '../step_details';
import { WizardNav } from '../wizard_nav';

import { TRANSFORM_STORAGE_KEYS } from './storage';
import { StepDefine } from './step_define';

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

interface WizardProps {
  cloneConfig?: TransformConfigUnion;
  initialTransformFunction?: TransformFunction;
  searchItems?: SearchItems;
  setSavedObjectId?: (savedObjectId: string) => void;
}

export const CreateTransformWizardContext = createContext<{
  dataView: DataView | null;
  runtimeMappings: RuntimeMappings | undefined;
}>({
  dataView: null,
  runtimeMappings: undefined,
});

const getInitialTransformFunction = (
  cloneConfig?: TransformConfigUnion,
  initialTransformFunction: TransformFunction = TRANSFORM_FUNCTION.PIVOT
): TransformFunction => {
  return cloneConfig && isLatestTransform(cloneConfig)
    ? TRANSFORM_FUNCTION.LATEST
    : initialTransformFunction;
};

export const Wizard: FC<WizardProps> = React.memo(
  ({
    cloneConfig,
    initialTransformFunction = TRANSFORM_FUNCTION.PIVOT,
    searchItems,
    setSavedObjectId,
  }) => {
    const { showNodeInfo } = useEnabledFeatures();
    const appDependencies = useAppDependencies();
    const { uiSettings, data, dataViewEditor, fieldFormats, charts } = appDependencies;
    const dataView = searchItems?.dataView;
    const defaultTransformFunction = getInitialTransformFunction(
      cloneConfig,
      initialTransformFunction
    );

    const [currentStep, setCurrentStep] = useState(WIZARD_STEPS.DEFINE);
    const [stepDefineState, setStepDefineState] = useState<StepDefineExposedState>();
    const [stepDetailsState, setStepDetailsState] = useState(() =>
      applyTransformConfigToDetailsState(
        getDefaultStepDetailsState(defaultTransformFunction),
        cloneConfig
      )
    );
    const [stepCreateState, setStepCreateState] = useState(getDefaultStepCreateState);
    const [savedDataViews, setSavedDataViews] = useState<DataViewListItem[]>([]);
    const [pendingDataViewId, setPendingDataViewId] = useState<string>();
    const changeDataViewModalTitleId = useGeneratedHtmlId();

    const resetWizardState = useCallback(
      (nextSearchItems: SearchItems, transformFunction: TransformFunction) => {
        const nextStepDefineState = applyTransformConfigToDefineState(
          {
            ...getDefaultStepDefineState(nextSearchItems),
            transformFunction,
          },
          cloneConfig,
          nextSearchItems.dataView
        );

        setStepDefineState(nextStepDefineState);
        setStepDetailsState(
          applyTransformConfigToDetailsState(
            getDefaultStepDetailsState(nextStepDefineState.transformFunction),
            cloneConfig
          )
        );
        setStepCreateState(getDefaultStepCreateState());
        setCurrentStep(WIZARD_STEPS.DEFINE);
      },
      [cloneConfig]
    );

    useEffect(() => {
      if (searchItems) {
        resetWizardState(searchItems, defaultTransformFunction);
      }
    }, [defaultTransformFunction, resetWizardState, searchItems]);

    const refreshSavedDataViews = useCallback(() => {
      data.dataViews.getIdsWithTitle().then(setSavedDataViews);
    }, [data.dataViews]);

    useEffect(() => {
      refreshSavedDataViews();
    }, [refreshSavedDataViews]);

    const requestDataViewChange = useCallback(
      (newDataViewId: string) => {
        if (newDataViewId === dataView?.id) {
          return;
        }

        if (!dataView) {
          setSavedObjectId?.(newDataViewId);
          return;
        }

        setPendingDataViewId(newDataViewId);
      },
      [dataView, setSavedObjectId]
    );

    const confirmDataViewChange = useCallback(() => {
      if (pendingDataViewId) {
        setStepDefineState(undefined);
        setStepDetailsState(getDefaultStepDetailsState(defaultTransformFunction));
        setStepCreateState(getDefaultStepCreateState());
        setCurrentStep(WIZARD_STEPS.DEFINE);
        setSavedObjectId?.(pendingDataViewId);
      }
      setPendingDataViewId(undefined);
    }, [defaultTransformFunction, pendingDataViewId, setSavedObjectId]);

    const cancelDataViewChange = useCallback(() => setPendingDataViewId(undefined), []);
    const canEditDataView = Boolean(dataViewEditor?.userPermissions.editDataView());
    const isDataViewPickerDisabled = setSavedObjectId === undefined;
    const dataViewPickerComponent = (
      <DataViewPicker
        compressed={false}
        currentDataViewId={dataView?.id}
        savedDataViews={savedDataViews}
        isDisabled={isDataViewPickerDisabled}
        onChangeDataView={requestDataViewChange}
        onDataViewCreated={
          canEditDataView
            ? (createdDataView) => {
                refreshSavedDataViews();
                if (createdDataView.id) {
                  requestDataViewChange(createdDataView.id);
                }
              }
            : undefined
        }
        trigger={{
          label:
            dataView?.getName() ??
            i18n.translate('xpack.transform.stepDefineForm.selectDataViewLabel', {
              defaultMessage: 'Select data view',
            }),
          title: dataView?.getName(),
          'data-test-subj': 'transformDataViewPicker',
        }}
      />
    );

    const dataViewPicker = (
      <EuiFormRow
        label={i18n.translate('xpack.transform.stepDefineForm.dataViewLabel', {
          defaultMessage: 'Data view',
        })}
      >
        {isDataViewPickerDisabled ? (
          <EuiToolTip
            content={i18n.translate('xpack.transform.stepDefineForm.cloneDataViewTooltip', {
              defaultMessage:
                'A cloned transform should use the same data source as the original transform.',
            })}
          >
            <span
              css={css`
                display: block;
              `}
              tabIndex={0}
            >
              {dataViewPickerComponent}
            </span>
          </EuiToolTip>
        ) : (
          dataViewPickerComponent
        )}
      </EuiFormRow>
    );

    const transformConfig =
      dataView && stepDefineState
        ? getCreateTransformRequestBody(dataView, stepDefineState, stepDetailsState)
        : undefined;

    const stepDefine = {
      title: i18n.translate('xpack.transform.transformsWizard.stepConfigurationTitle', {
        defaultMessage: 'Configuration',
      }),
      children: (
        <StepDefine
          dataViewPicker={dataViewPicker}
          initialTransformFunction={defaultTransformFunction}
          isCurrentStep={currentStep === WIZARD_STEPS.DEFINE}
          onNext={() => setCurrentStep(WIZARD_STEPS.DETAILS)}
          stepDefineState={stepDefineState}
          setStepDefineState={setStepDefineState}
          searchItems={searchItems}
        />
      ),
    };

    const stepDetails = {
      title: i18n.translate('xpack.transform.transformsWizard.stepDetailsTitle', {
        defaultMessage: 'Transform details',
      }),
      children: (
        <>
          {currentStep === WIZARD_STEPS.DETAILS && searchItems && stepDefineState ? (
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
      ),
      status: currentStep >= WIZARD_STEPS.DETAILS ? undefined : ('incomplete' as EuiStepStatus),
    };

    const stepCreate = {
      title: i18n.translate('xpack.transform.transformsWizard.stepCreateTitle', {
        defaultMessage: 'Create',
      }),
      children: (
        <>
          {currentStep === WIZARD_STEPS.CREATE && transformConfig ? (
            <StepCreateForm
              createDataView={stepDetailsState.createDataView}
              deferValidation={stepDetailsState.deferValidation}
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

    const wizard = (
      <CreateTransformWizardContext.Provider
        value={{ dataView: dataView ?? null, runtimeMappings: stepDefineState?.runtimeMappings }}
      >
        <UrlStateProvider>
          <StorageContextProvider storage={localStorage} storageKeys={TRANSFORM_STORAGE_KEYS}>
            <DatePickerContextProvider {...datePickerDeps}>
              <EuiSteps css={styles.steps} steps={stepsConfig} />
              {pendingDataViewId ? (
                <EuiConfirmModal
                  aria-labelledby={changeDataViewModalTitleId}
                  titleProps={{ id: changeDataViewModalTitleId }}
                  title={i18n.translate(
                    'xpack.transform.transformsWizard.changeDataViewConfirmModalTitle',
                    {
                      defaultMessage: 'Change data view?',
                    }
                  )}
                  onCancel={cancelDataViewChange}
                  onConfirm={confirmDataViewChange}
                  cancelButtonText={i18n.translate(
                    'xpack.transform.transformsWizard.changeDataViewCancelButton',
                    {
                      defaultMessage: 'Cancel',
                    }
                  )}
                  confirmButtonText={i18n.translate(
                    'xpack.transform.transformsWizard.changeDataViewConfirmButton',
                    {
                      defaultMessage: 'Change data view',
                    }
                  )}
                  defaultFocusedButton="confirm"
                  buttonColor="danger"
                  data-test-subj="transformChangeDataViewConfirmModal"
                >
                  <p>
                    {i18n.translate(
                      'xpack.transform.transformsWizard.changeDataViewConfirmModalDescription',
                      {
                        defaultMessage:
                          'Changing the data view will clear all configured fields in this transform.',
                      }
                    )}
                  </p>
                </EuiConfirmModal>
              ) : null}
            </DatePickerContextProvider>
          </StorageContextProvider>
        </UrlStateProvider>
      </CreateTransformWizardContext.Provider>
    );

    if (!dataView || !stepDefineState) {
      return wizard;
    }

    return (
      <FieldStatsFlyoutProvider
        dataView={dataView}
        fieldStatsServices={fieldStatsServices}
        timeRangeMs={stepDefineState.timeRangeMs}
        dslQuery={transformConfig?.source.query}
      >
        {wizard}
      </FieldStatsFlyoutProvider>
    );
  }
);
