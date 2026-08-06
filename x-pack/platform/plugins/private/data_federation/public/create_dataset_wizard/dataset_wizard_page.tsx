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
  getWizardFormDraftStorageKey,
  loadWizardFormDraft,
  mergeWizardFormValues,
} from './dataset_wizard_form_persistence';
import { resolveWizardFlowVariant } from './dataset_wizard_flow_variant';

const DATA_FEDERATION_MANAGEMENT_PATH = `/app/management/data/${PLUGIN_ID}`;

export const DatasetWizardPage: FunctionComponent = () => {
  const history = useHistory();
  const location = useLocation();
  const { datasetName: encodedDatasetName } = useParams<{ datasetName?: string }>();
  const datasetName = encodedDatasetName ? decodeURIComponent(encodedDatasetName) : undefined;
  const isEditMode = datasetName !== undefined;

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

  const initialDataSet = useMemo(
    () => (isEditMode ? dataSets.find((ds) => ds.name === datasetName) : undefined),
    [dataSets, datasetName, isEditMode]
  );

  const existingDataSetNames = useMemo(() => dataSets.map((ds) => ds.name), [dataSets]);

  const defaultValues = useMemo(() => {
    const base = initialDataSet
      ? dataSetToWizardFormValues(initialDataSet)
      : emptyDatasetWizardFormValues();
    const draft = loadWizardFormDraft(getWizardFormDraftStorageKey(isEditMode, datasetName));

    return draft ? mergeWizardFormValues(base, draft) : base;
  }, [datasetName, initialDataSet, isEditMode]);

  const flowVariant = useMemo(
    () => resolveWizardFlowVariant(location.search),
    [location.search]
  );

  const pageTitle = isEditMode
    ? datasetWizardStrings.editPageTitle(datasetName ?? '')
    : datasetWizardStrings.createPageTitle();

  const onBack = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      history.push('/');
    },
    [history]
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
          title: isEditMode
            ? datasetWizardStrings.saveButton()
            : datasetWizardStrings.addButton(),
          text: message,
        });
        return message;
      }
    },
    [datasetsClient, history, isEditMode, reloadDataSets, toasts]
  );

  useEffect(() => {
    if (isEditMode && hasLoadedDataSets && !initialDataSet) {
      history.replace('/');
    }
  }, [hasLoadedDataSets, history, initialDataSet, isEditMode]);

  if (!hasLoadedDataSources || !hasLoadedDataSets) {
    return null;
  }

  if (isEditMode && !initialDataSet) {
    return null;
  }

  return (
    <>
      <AppHeader title={pageTitle} back={back} spacing="bleed" />
      <EuiSpacer size="l" />
      <DatasetWizard
        key={isEditMode ? initialDataSet?.name : `create-${flowVariant}`}
        isEditMode={isEditMode}
        initialDataSet={initialDataSet}
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
