/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, MouseEvent } from 'react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { useHistory, useLocation, useParams } from 'react-router-dom';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { PLUGIN_ID, type DataSetWithName, type DataSource } from '../../common';
import { getClonedDatasetName } from '../get_cloned_dataset_name';
import { getFlyoutSaveErrorMessage } from '../get_flyout_save_error_message';
import { mainTranslations } from '../main_i18n';
import type { DataFederationKibanaServices } from '../types';
import { useLoadList } from '../use_load_list';
import { DatasetWizard } from './dataset_wizard';
import { datasetWizardStrings } from './dataset_wizard_i18n';
import {
  dataSetToWizardFormValues,
  emptyDatasetWizardFormValues,
} from './dataset_wizard_form_state';
import {
  clearWizardFormDraft,
  getWizardFormDraftStorageKey,
  loadWizardFormDraft,
  mergeWizardFormValues,
} from './dataset_wizard_form_persistence';
import {
  DATASET_WIZARD_FLOW_VARIANT_1,
  DATASET_WIZARD_FLOW_VARIANT_3,
  isDatasetWizardFlow3,
  resolveWizardFlowVariant,
} from './dataset_wizard_flow_variant';

const DATA_FEDERATION_MANAGEMENT_PATH = `/app/management/data/${PLUGIN_ID}`;

export const DatasetWizardPage: FunctionComponent = () => {
  const history = useHistory();
  const location = useLocation();
  const { datasetName: encodedDatasetName } = useParams<{ datasetName?: string }>();
  const datasetName = encodedDatasetName ? decodeURIComponent(encodedDatasetName) : undefined;
  const isCloneMode = location.pathname.startsWith('/clone/');
  const isEditMode = datasetName !== undefined && !isCloneMode;

  const {
    services: { dataSourcesClient, datasetsClient, toasts },
  } = useKibana<DataFederationKibanaServices>();

  const {
    items: dataSources,
    hasLoaded: hasLoadedDataSources,
    reload: reloadDataSources,
  } = useLoadList<DataSource>(
    useCallback(async () => await dataSourcesClient.get(), [dataSourcesClient])
  );

  const {
    items: dataSets,
    hasLoaded: hasLoadedDataSets,
    reload: reloadDataSets,
  } = useLoadList<DataSetWithName>(
    useCallback(async () => await datasetsClient.get(), [datasetsClient])
  );

  const sourceDataSet = useMemo(
    () => (datasetName !== undefined ? dataSets.find((ds) => ds.name === datasetName) : undefined),
    [dataSets, datasetName]
  );

  const existingDataSetNames = useMemo(() => dataSets.map((ds) => ds.name), [dataSets]);

  const draftStorageKey = useMemo(
    () => getWizardFormDraftStorageKey(isEditMode, datasetName),
    [datasetName, isEditMode]
  );

  const defaultValues = useMemo(() => {
    if (isCloneMode && sourceDataSet) {
      return {
        ...dataSetToWizardFormValues(sourceDataSet),
        name: getClonedDatasetName(sourceDataSet.name, existingDataSetNames),
      };
    }

    const base =
      isEditMode && sourceDataSet
        ? dataSetToWizardFormValues(sourceDataSet)
        : emptyDatasetWizardFormValues();
    const draft = loadWizardFormDraft(draftStorageKey);

    return draft ? mergeWizardFormValues(base, draft) : base;
  }, [draftStorageKey, existingDataSetNames, isCloneMode, isEditMode, sourceDataSet]);

  const flowVariant = useMemo(
    () =>
      resolveWizardFlowVariant(
        location.search,
        isEditMode || isCloneMode
          ? DATASET_WIZARD_FLOW_VARIANT_3
          : DATASET_WIZARD_FLOW_VARIANT_1
      ),
    [isCloneMode, isEditMode, location.search]
  );

  const pageTitle = isCloneMode
    ? datasetWizardStrings.clonePageTitle(datasetName ?? '')
    : isEditMode
    ? datasetWizardStrings.editPageTitle(datasetName ?? '')
    : datasetWizardStrings.createPageTitle();

  const onBack = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      if (isDatasetWizardFlow3(flowVariant)) {
        clearWizardFormDraft(draftStorageKey);
      }
      history.push('/');
    },
    [draftStorageKey, flowVariant, history]
  );

  const back = useMemo(
    () => ({
      href: DATA_FEDERATION_MANAGEMENT_PATH,
      label: mainTranslations.pageTitle,
      onClick: onBack,
    }),
    [onBack]
  );

  const onCancel = useCallback(() => {
    history.push('/');
  }, [history]);

  const onSave = useCallback(
    async (dataSet: DataSetWithName, previousId?: string): Promise<string | null> => {
      try {
        const nextId = dataSet.name.trim();
        const prevIdTrimmed = previousId?.trim();

        await datasetsClient.add(dataSet);

        if (prevIdTrimmed && prevIdTrimmed !== nextId) {
          await datasetsClient.delete(prevIdTrimmed);
        }

        await reloadDataSets();
        history.push('/');
        return null;
      } catch (e) {
        const message = getFlyoutSaveErrorMessage(e);
        toasts.addDanger({
          title: isEditMode ? datasetWizardStrings.saveButton() : datasetWizardStrings.addButton(),
          text: message,
        });
        return message;
      }
    },
    [datasetsClient, history, isEditMode, reloadDataSets, toasts]
  );

  const requiresSourceDataSet = isEditMode || isCloneMode;

  useEffect(() => {
    if (requiresSourceDataSet && hasLoadedDataSets && !sourceDataSet) {
      history.replace('/');
    }
  }, [hasLoadedDataSets, history, requiresSourceDataSet, sourceDataSet]);

  if (!hasLoadedDataSources || !hasLoadedDataSets) {
    return null;
  }

  if (requiresSourceDataSet && !sourceDataSet) {
    return null;
  }

  return (
    <>
      <AppHeader title={pageTitle} back={back} spacing="bleed" />
      <EuiSpacer size="l" />
      <DatasetWizard
        key={
          isCloneMode
            ? `clone-${sourceDataSet?.name}`
            : isEditMode
            ? sourceDataSet?.name
            : `create-${flowVariant}`
        }
        isEditMode={isEditMode}
        initialDataSet={isEditMode ? sourceDataSet : undefined}
        existingDataSetNames={existingDataSetNames}
        dataSources={dataSources}
        defaultValues={defaultValues}
        flowVariant={flowVariant}
        reloadDataSources={reloadDataSources}
        onCancel={onCancel}
        onSave={onSave}
      />
    </>
  );
};
