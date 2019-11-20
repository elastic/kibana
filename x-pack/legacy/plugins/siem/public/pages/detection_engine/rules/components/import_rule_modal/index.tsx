/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  // @ts-ignore no-exported-member
  EuiFilePicker,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import React, { useCallback, useState } from 'react';
import * as i18n from './translations';
import { duplicateRules } from '../../../../../containers/detection_engine/rules/api';
import { useKibanaUiSetting } from '../../../../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../../../../common/constants';
import { ndjsonToJSON } from '../json_downloader';
import { Rule } from '../../../../../containers/detection_engine/rules/types';

interface ImportRuleModalProps {
  showModal: boolean;
  closeModal: () => void;
  importComplete: (rules: Rule[]) => void;
}

/**
 * Modal component for importing Rules from a json file
 *
 * @param filename name of file to be downloaded
 * @param payload JSON string to write to file
 *
 */
export const ImportRuleModal = React.memo<ImportRuleModalProps>(
  ({ showModal, closeModal, importComplete }) => {
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);

    const importRules = useCallback(async () => {
      if (selectedFiles != null) {
        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async event => {
          // TODO: Validation via io-ts
          // @ts-ignore type is string, not ArrayBuffer as FileReader.readAsText is called
          const importedRules = ndjsonToJSON(event?.target?.result ?? '') as Rule[];
          const duplicatedRules = await duplicateRules({ rules: importedRules, kbnVersion });

          setIsImporting(false);
          setSelectedFiles(null);
          importComplete(duplicatedRules);
          closeModal();
        };
        Object.values(selectedFiles).map(f => reader.readAsText(f));
      }
    }, [selectedFiles]);

    return (
      <>
        {showModal && (
          <EuiOverlayMask>
            <EuiModal onClose={closeModal} maxWidth={'750px'}>
              <EuiModalHeader>
                <EuiModalHeaderTitle>{i18n.IMPORT_RULE}</EuiModalHeaderTitle>
              </EuiModalHeader>

              <EuiModalBody>
                <EuiText size="s">
                  <h4>{i18n.SELECT_RULE}</h4>
                </EuiText>

                <EuiSpacer size="s" />
                <EuiFilePicker
                  id="rule-file-picker"
                  multiple
                  initialPromptText={i18n.INITIAL_PROMPT_TEXT}
                  onChange={(files: FileList) => {
                    setSelectedFiles(Object.keys(files).length > 0 ? files : null);
                  }}
                  display={'large'}
                  fullWidth={true}
                  isLoading={isImporting}
                />
                <EuiSpacer size="s" />
                <EuiCheckbox
                  id="rule-overwrite-saved-object"
                  label={i18n.OVERWRITE_WITH_SAME_NAME}
                  disabled={true}
                  onChange={() => {}}
                />
              </EuiModalBody>

              <EuiModalFooter>
                <EuiButtonEmpty onClick={closeModal}>{i18n.CANCEL_BUTTON}</EuiButtonEmpty>
                <EuiButton
                  onClick={importRules}
                  disabled={selectedFiles == null || isImporting}
                  fill
                >
                  {i18n.IMPORT_RULE}
                </EuiButton>
              </EuiModalFooter>
            </EuiModal>
          </EuiOverlayMask>
        )}
      </>
    );
  }
);

ImportRuleModal.displayName = 'ImportRuleModal';
