/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
import { useSettingsUpdater } from '../use_settings_updater/use_settings_updater';
import { AlertsSettings } from './alerts_settings';
import { SAVE } from '../translations';

interface AlertSettingsModalProps {
  onClose: () => void;
}

export const AlertsSettingsModal = ({ onClose }: AlertSettingsModalProps) => {
  const { knowledgeBase, setUpdatedKnowledgeBaseSettings, saveSettings } = useSettingsUpdater(
    {},
    { page: 1, perPage: 10, total: 0, data: [] },
    true,
    true
  );

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
        <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
        <EuiButton
          type="submit"
          onClick={() => {
            saveSettings();
            onClose();
          }}
          fill
        >
          {SAVE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
