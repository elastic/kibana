/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiHorizontalRule,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  useGeneratedHtmlId,
  EuiFormRow,
  useEuiTheme,
} from '@elastic/eui';
import { i18n as I18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { ContextEditor } from '../context_editor';
import { Stats } from '../stats';
import * as i18n from '../../data_anonymization/settings/anonymization_settings/translations';
import { SelectedPromptContext } from '../../assistant/prompt_context/types';
import { BatchUpdateListItem } from '../context_editor/types';
import { getIsDataAnonymizable } from '../helpers';
import { useAssistantContext } from '../../assistant_context';
import {
  SEARCH,
  useTable as useAnonymizationTable,
} from '../../data_anonymization/settings/anonymization_settings_management/use_table';
import { useAnonymizationUpdater } from '../../assistant/settings/use_settings_updater/use_anonymization_updater';
import type { OnListUpdated } from '../../assistant/settings/use_settings_updater/use_anonymization_updater';
import { useSelection } from '../context_editor/selection/use_selection';

export interface Props {
  onClose: () => void;
  onSave: (updates: BatchUpdateListItem[]) => void;
  promptContext: SelectedPromptContext;
}

const SelectedPromptContextEditorModalComponent = ({ onClose, onSave, promptContext }: Props) => {
  const { euiTheme } = useEuiTheme();
  const { http, toasts, nameSpace } = useAssistantContext();

  const {
    anonymizationPageFields,
    anonymizationAllFields,
    onTableChange,
    pagination,
    sorting,
    handleSearch,
  } = useAnonymizationTable(nameSpace);

  const {
    handlePageReset,
    handleRowReset,
    onListUpdated: onAnonymizationListUpdated,
    saveAnonymizationSettings,
    updatedAnonymizationData: updatedAnonymizationPageData,
  } = useAnonymizationUpdater({
    anonymizationFields: anonymizationPageFields,
    http,
    toasts,
  });

  const { selectionActions, selectionState } = useSelection({
    anonymizationAllFields,
    anonymizationPageFields,
  });

  const [checked, setChecked] = useState(false);
  const checkboxId = useGeneratedHtmlId({ prefix: 'updateSettingPresetsCheckbox' });

  const [contextUpdates, setContextUpdates] = React.useState<BatchUpdateListItem[]>([]);
  const [selectedPromptContext, setSelectedPromptContext] = React.useState(promptContext);

  const isDataAnonymizable = useMemo<boolean>(
    () => getIsDataAnonymizable(selectedPromptContext.rawData),
    [selectedPromptContext.rawData]
  );

  const handleSave = useCallback(async () => {
    if (onSave) {
      onSave(contextUpdates);
    }
    try {
      await saveAnonymizationSettings();
    } catch (e) {
      /* empty */
    }
    onClose();
  }, [contextUpdates, onClose, onSave, saveAnonymizationSettings]);

  const onListUpdated: OnListUpdated = useCallback(
    (updates, isSelectAll) => {
      setContextUpdates((prev) => [...prev, ...updates]);

      onAnonymizationListUpdated(updates, isSelectAll, anonymizationAllFields);
      setSelectedPromptContext((prev) => ({ ...prev, data: anonymizationAllFields.data }));
    },
    [anonymizationAllFields, onAnonymizationListUpdated]
  );

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(e.target.checked);
  }, []);

  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader
        css={css`
          flex-direction: column;
          align-items: flex-start;
          padding-bottom: 0;
        `}
      >
        <EuiModalHeaderTitle>{i18n.SETTINGS_TITLE}</EuiModalHeaderTitle>
        <EuiSpacer size="xs" />
        <EuiText size={'xs'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
        <EuiHorizontalRule margin="s" />
      </EuiModalHeader>

      <EuiModalBody>
        <Stats
          isDataAnonymizable={isDataAnonymizable}
          anonymizationFields={selectedPromptContext.contextAnonymizationFields?.data}
          rawData={selectedPromptContext.rawData}
        />
        <EuiSpacer size="s" />
        <ContextEditor
          anonymizationAllFields={anonymizationAllFields}
          anonymizationPageFields={updatedAnonymizationPageData}
          compressed={false}
          onTableChange={onTableChange}
          pagination={pagination}
          sorting={sorting}
          search={SEARCH}
          handleSearch={handleSearch}
          handleRowReset={handleRowReset}
          handlePageReset={handlePageReset}
          onListUpdated={onListUpdated}
          rawData={selectedPromptContext.rawData as Record<string, string[]>}
          selectionState={selectionState}
          selectionActions={selectionActions}
        />
      </EuiModalBody>

      <EuiModalFooter
        css={css`
          background: ${euiTheme.colors.backgroundBaseSubdued};
          padding-block: 16px;
        `}
      >
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFormRow
              helpText={I18n.translate(
                'xpack.elasticAssistant.dataAnonymizationEditor.updatePresetsCheckboxHelpText',
                {
                  defaultMessage:
                    'Apply new anonymization settings for current & future conversations.',
                }
              )}
            >
              <EuiCheckbox
                id={checkboxId}
                label={I18n.translate(
                  'xpack.elasticAssistant.dataAnonymizationEditor.updatePresetsCheckboxLabel',
                  {
                    defaultMessage: 'Update presets',
                  }
                )}
                checked={checked}
                onChange={onChange}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem>
                <EuiButtonEmpty onClick={onClose} size="s">
                  {I18n.translate('xpack.elasticAssistant.dataAnonymizationEditor.closeButton', {
                    defaultMessage: 'Close',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton onClick={handleSave} fill size="s">
                  {I18n.translate('xpack.elasticAssistant.dataAnonymizationEditor.saveButton', {
                    defaultMessage: 'Save',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};

SelectedPromptContextEditorModalComponent.displayName = 'SelectedPromptContextEditor';

export const SelectedPromptContextEditorModal = React.memo(
  SelectedPromptContextEditorModalComponent
);
