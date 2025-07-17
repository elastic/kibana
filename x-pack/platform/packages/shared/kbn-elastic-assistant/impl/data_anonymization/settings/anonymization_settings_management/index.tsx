/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback } from 'react';

import { euiThemeVars } from '@kbn/ui-theme';
import { useAnonymizationUpdater } from '../../../assistant/settings/use_settings_updater/use_anonymization_updater';
import { Stats } from '../../../data_anonymization_editor/stats';
import { ContextEditor } from '../../../data_anonymization_editor/context_editor';
import * as i18n from '../anonymization_settings/translations';

import { AssistantSettingsBottomBar } from '../../../assistant/settings/assistant_settings_bottom_bar';
import { useAssistantContext } from '../../../assistant_context';
import {
  CANCEL,
  SAVE,
  SETTINGS_UPDATED_TOAST_TITLE,
} from '../../../assistant/settings/translations';

import { SEARCH, useTable } from './use_table';
import { useSelection } from '../../../data_anonymization_editor/context_editor/selection/use_selection';

export interface Props {
  modalMode?: boolean;
  onClose?: () => void;
}

const AnonymizationSettingsManagementComponent: React.FC<Props> = ({
  modalMode = false,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const { http, toasts, nameSpace } = useAssistantContext();

  const {
    anonymizationFields,
    anonymizationAllFields,
    anonymizationFieldsStatus,
    onTableChange,
    pagination,
    sorting,
    handleSearch,
    refetch,
  } = useTable(nameSpace);

  const {
    handlePageReset,
    handleRowReset,
    hasPendingChanges,
    onListUpdated,
    resetAnonymizationSettings,
    saveAnonymizationSettings,
    updatedAnonymizationData: updatedAnonymizationPageData,
  } = useAnonymizationUpdater({
    anonymizationAllFields,
    anonymizationFields,
    http,
    toasts,
  });

  const { selectionActions, selectionState } = useSelection({
    anonymizationAllFields,
    anonymizationPageFields: anonymizationFields,
  });

  const handleTableReset = useCallback(() => {
    resetAnonymizationSettings();
    selectionActions?.handleUnselectAll();
  }, [resetAnonymizationSettings, selectionActions]);

  const onCancelClick = useCallback(() => {
    onClose?.();
    handleTableReset();
  }, [onClose, handleTableReset]);

  const handleSave = useCallback(async () => {
    const updateSuccess = await saveAnonymizationSettings();
    if (updateSuccess) {
      toasts?.addSuccess({
        iconType: 'check',
        title: SETTINGS_UPDATED_TOAST_TITLE,
      });
    }

    await refetch();
    selectionActions?.handleUnselectAll();
  }, [refetch, saveAnonymizationSettings, selectionActions, toasts]);

  const onSaveButtonClicked = useCallback(() => {
    handleSave();
    onClose?.();
  }, [handleSave, onClose]);

  if (modalMode) {
    return (
      <EuiModal onClose={onCancelClick}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.SETTINGS_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText size="m">{i18n.SETTINGS_DESCRIPTION}</EuiText>

          <EuiSpacer size="m" />

          <EuiFlexGroup alignItems="center" data-test-subj="summary" gutterSize="none">
            <Stats
              anonymizationFieldsStatus={anonymizationFieldsStatus}
              isDataAnonymizable={true}
              anonymizationFields={anonymizationFields.data}
              titleSize="m"
              gap={euiThemeVars.euiSizeS}
            />
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <ContextEditor
            anonymizationAllFields={anonymizationAllFields}
            anonymizationPageFields={updatedAnonymizationPageData}
            compressed={false}
            onListUpdated={onListUpdated}
            rawData={null}
            onTableChange={onTableChange}
            pagination={pagination}
            sorting={sorting}
            search={SEARCH}
            handleSearch={handleSearch}
            handleTableReset={handleTableReset}
            handleRowReset={handleRowReset}
            handlePageReset={handlePageReset}
            selectionState={selectionState}
            selectionActions={selectionActions}
          />
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty onClick={onCancelClick}>{CANCEL}</EuiButtonEmpty>
          <EuiButton type="submit" onClick={onSaveButtonClicked} fill disabled={!hasPendingChanges}>
            {SAVE}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder paddingSize="l">
        <EuiText size="m">{i18n.SETTINGS_DESCRIPTION}</EuiText>

        <EuiSpacer size="m" />

        <EuiFlexGroup alignItems="center" data-test-subj="summary" gutterSize="none">
          <Stats
            anonymizationFieldsStatus={anonymizationFieldsStatus}
            isDataAnonymizable={true}
            anonymizationFields={anonymizationAllFields.data}
            titleSize="m"
            gap={euiThemeVars.euiSizeS}
          />
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <ContextEditor
          anonymizationAllFields={anonymizationAllFields}
          anonymizationPageFields={updatedAnonymizationPageData}
          compressed={false}
          onListUpdated={onListUpdated}
          rawData={null}
          onTableChange={onTableChange}
          pagination={pagination}
          sorting={sorting}
          search={SEARCH}
          handleSearch={handleSearch}
          handleRowReset={handleRowReset}
          handlePageReset={handlePageReset}
          handleTableReset={handleTableReset}
          selectionState={selectionState}
          selectionActions={selectionActions}
        />
      </EuiPanel>
      <AssistantSettingsBottomBar
        hasPendingChanges={hasPendingChanges}
        onCancelClick={onCancelClick}
        onSaveButtonClicked={onSaveButtonClicked}
      />
    </>
  );
};

AnonymizationSettingsManagementComponent.displayName = 'AnonymizationSettingsManagementComponent';

export const AnonymizationSettingsManagement = React.memo(AnonymizationSettingsManagementComponent);
