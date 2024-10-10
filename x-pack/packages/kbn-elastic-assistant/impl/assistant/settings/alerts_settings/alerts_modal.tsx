import React from 'react';
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
import { useSettingsUpdater } from '../use_settings_updater/use_settings_updater';
import { AlertsSettings } from './alerts_settings';
import { ALERTS_LABEL } from '@kbn/elastic-assistant/impl/knowledge_base/translations';
import { SAVE } from '../translations';

type AlertSettingsModalProps = {
  onClose: () => void;
}

export const AlertsSettingsModal = ({ onClose }: AlertSettingsModalProps) => {
  const modalFormId = useGeneratedHtmlId({ prefix: 'modalForm' });
  const modalTitleId = useGeneratedHtmlId();
  const { knowledgeBase, setUpdatedKnowledgeBaseSettings, saveSettings } = useSettingsUpdater({},{page:1, perPage:10, total:0, data: []},true,true);

  return (
        <EuiModal
          aria-labelledby={modalTitleId}
          onClose={onClose}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>
              {ALERTS_LABEL}
            </EuiModalHeaderTitle>
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
              form={modalFormId}
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
