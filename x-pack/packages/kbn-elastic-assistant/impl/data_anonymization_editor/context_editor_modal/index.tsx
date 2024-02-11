/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
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
} from '@elastic/eui';
import { i18n as I18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { ContextEditor } from '../context_editor';
import { Stats } from '../stats';
import * as i18n from '../../data_anonymization/settings/anonymization_settings/translations';
import { SelectedPromptContext } from '../../assistant/prompt_context/types';
import { BatchUpdateListItem } from '../context_editor/types';
import { updateSelectedPromptContext, getIsDataAnonymizable } from '../helpers';

export interface Props {
  onClose: () => void;
  onSave: (updates: BatchUpdateListItem[]) => void;
  promptContext: SelectedPromptContext;
}

const SelectedPromptContextEditorModalComponent = ({ onClose, onSave, promptContext }: Props) => {
  const [contextUpdates, setContextUpdates] = React.useState<BatchUpdateListItem[]>([]);
  const [selectedPromptContext, setSelectedPromptContext] = React.useState(promptContext);

  const isDataAnonymizable = useMemo<boolean>(
    () => getIsDataAnonymizable(selectedPromptContext.rawData),
    [selectedPromptContext.rawData]
  );

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(contextUpdates);
    }
    onClose();
  }, [contextUpdates, onClose, onSave]);

  const onListUpdated = useCallback((updates: BatchUpdateListItem[]) => {
    setContextUpdates((prev) => [...prev, ...updates]);
    setSelectedPromptContext((prev) =>
      updates.reduce<SelectedPromptContext>(
        (acc, { field, operation, update }) =>
          updateSelectedPromptContext({
            field,
            operation,
            selectedPromptContext: acc,
            update,
          }),
        prev
      )
    );
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
          selectedPromptContext={selectedPromptContext}
        />
        <ContextEditor
          allow={selectedPromptContext.allow}
          allowReplacement={selectedPromptContext.allowReplacement}
          onListUpdated={onListUpdated}
          rawData={selectedPromptContext.rawData as Record<string, string[]>}
        />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} size="s">
          {I18n.translate('kbnElasticAssistant.dataAnonymizationEditor.closeButton', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>
        <EuiButton onClick={handleSave} fill size="s">
          {I18n.translate('kbnElasticAssistant.dataAnonymizationEditor.saveButton', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

SelectedPromptContextEditorModalComponent.displayName = 'SelectedPromptContextEditor';

export const SelectedPromptContextEditorModal = React.memo(
  SelectedPromptContextEditorModalComponent
);
