/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useAssistantContext } from '../../../..';
import { useKnowledgeBaseUpdater } from '../use_settings_updater/use_knowledge_base_updater';
import { ALERTS_LABEL } from '../../../knowledge_base/translations';
import { AlertsSettings } from './alerts_settings';
import { CANCEL, SAVE } from '../translations';

interface AlertSettingsModalProps {
  onClose: () => void;
}

export const AlertsSettingsModal = ({ onClose }: AlertSettingsModalProps) => {
  const { assistantTelemetry, knowledgeBase, setKnowledgeBase } = useAssistantContext();

  const { knowledgeBaseSettings, saveKnowledgeBaseSettings, setUpdatedKnowledgeBaseSettings } =
    useKnowledgeBaseUpdater({ assistantTelemetry, knowledgeBase, setKnowledgeBase });

  const modalTitleId = useGeneratedHtmlId();

  const handleSave = useCallback(() => {
    saveKnowledgeBaseSettings();
    onClose();
  }, [onClose, saveKnowledgeBaseSettings]);

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{ALERTS_LABEL}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <AlertsSettings
          knowledgeBase={knowledgeBaseSettings}
          setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>{CANCEL}</EuiButtonEmpty>
        <EuiButton type="submit" onClick={handleSave} fill>
          {SAVE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
