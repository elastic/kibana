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
} from '@elastic/eui';
import { ALERTS_LABEL } from '../../../knowledge_base/translations';
import {
  DEFAULT_CONVERSATIONS,
  DEFAULT_PROMPTS,
  useSettingsUpdater,
} from '../use_settings_updater/use_settings_updater';
import { AlertsSettings } from './alerts_settings';
import { CANCEL, SAVE } from '../translations';

interface AlertSettingsModalProps {
  onClose: () => void;
}

export const AlertsSettingsModal = ({ onClose }: AlertSettingsModalProps) => {
  const { knowledgeBase, setUpdatedKnowledgeBaseSettings, saveSettings } = useSettingsUpdater(
    DEFAULT_CONVERSATIONS, // Alerts settings do not require conversations
    DEFAULT_PROMPTS, // Alerts settings do not require prompts
    false, // Alerts settings do not require conversations
    false // Alerts settings do not require prompts
  );

  const handleSave = useCallback(() => {
    saveSettings();
    onClose();
  }, [onClose, saveSettings]);

  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{ALERTS_LABEL}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <AlertsSettings
          knowledgeBase={knowledgeBase}
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
