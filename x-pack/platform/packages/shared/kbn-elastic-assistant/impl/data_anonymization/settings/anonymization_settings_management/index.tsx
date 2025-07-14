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
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback } from 'react';

import { useAnonymizationUpdater } from '../../../assistant/settings/use_settings_updater/use_anonymization_updater';
import { Stats } from '../../../data_anonymization_editor/stats';
import { ContextEditor } from '../../../data_anonymization_editor/context_editor';
import * as i18n from '../anonymization_settings/translations';
import { useFetchAnonymizationFields } from '../../../assistant/api/anonymization_fields/use_fetch_anonymization_fields';
import { AssistantSettingsBottomBar } from '../../../assistant/settings/assistant_settings_bottom_bar';
import { useAssistantContext } from '../../../assistant_context';
import {
  CANCEL,
  SAVE,
  SETTINGS_UPDATED_TOAST_TITLE,
} from '../../../assistant/settings/translations';

export interface Props {
  modalMode?: boolean;
  onClose?: () => void;
}

const AnonymizationSettingsManagementComponent: React.FC<Props> = ({
  modalMode = false,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const { http, toasts } = useAssistantContext();
  const { data: anonymizationFields, refetch } = useFetchAnonymizationFields();

  const {
    hasPendingChanges,
    onListUpdated,
    resetAnonymizationSettings,
    saveAnonymizationSettings,
    updatedAnonymizationData,
  } = useAnonymizationUpdater({
    anonymizationFields,
    http,
    toasts,
  });

  const onCancelClick = useCallback(() => {
    onClose?.();
    resetAnonymizationSettings();
  }, [onClose, resetAnonymizationSettings]);

  const handleSave = useCallback(async () => {
    await saveAnonymizationSettings();
    toasts?.addSuccess({
      iconType: 'check',
      title: SETTINGS_UPDATED_TOAST_TITLE,
    });
    await refetch();
  }, [refetch, saveAnonymizationSettings, toasts]);

  const onSaveButtonClicked = useCallback(() => {
    handleSave();
    onClose?.();
  }, [handleSave, onClose]);

  const modalTitleId = useGeneratedHtmlId();

  if (modalMode) {
    return (
      <EuiModal onClose={onCancelClick} aria-labelledby={modalTitleId}>
        <EuiModalHeader>
          <EuiModalHeaderTitle id={modalTitleId}>{i18n.SETTINGS_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText size="m">{i18n.SETTINGS_DESCRIPTION}</EuiText>

          <EuiSpacer size="m" />

          <EuiFlexGroup alignItems="center" data-test-subj="summary" gutterSize="none">
            <Stats
              isDataAnonymizable={true}
              anonymizationFields={updatedAnonymizationData.data}
              titleSize="m"
              gap={euiTheme.size.s}
            />
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <ContextEditor
            anonymizationFields={updatedAnonymizationData}
            compressed={false}
            onListUpdated={onListUpdated}
            rawData={null}
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
            isDataAnonymizable={true}
            anonymizationFields={updatedAnonymizationData.data}
            titleSize="m"
            gap={euiTheme.size.s}
          />
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <ContextEditor
          anonymizationFields={updatedAnonymizationData}
          compressed={false}
          onListUpdated={onListUpdated}
          rawData={null}
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
