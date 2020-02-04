/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  // @ts-ignore no-exported-member
  EuiFilePicker,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import { importRules } from '../../../../../containers/detection_engine/rules';
import {
  displayErrorToast,
  displaySuccessToast,
  useStateToaster,
} from '../../../../../components/toasters';
import * as i18n from './translations';

interface ImportRuleModalProps {
  showModal: boolean;
  closeModal: () => void;
  importComplete: () => void;
}

/**
 * Modal component for importing Rules from a json file
 */
export const ImportRuleModalComponent = ({
  showModal,
  closeModal,
  importComplete,
}: ImportRuleModalProps) => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [, dispatchToaster] = useStateToaster();

  const cleanupAndCloseModal = () => {
    setIsImporting(false);
    setSelectedFiles(null);
    closeModal();
  };

  const importRulesCallback = useCallback(async () => {
    if (selectedFiles != null) {
      setIsImporting(true);
      const abortCtrl = new AbortController();

      try {
        const importResponse = await importRules({
          fileToImport: selectedFiles[0],
          overwrite,
          signal: abortCtrl.signal,
        });

        // TODO: Improve error toast details for better debugging failed imports
        // e.g. When success == true && success_count === 0 that means no rules were overwritten, etc
        if (importResponse.success) {
          displaySuccessToast(
            i18n.SUCCESSFULLY_IMPORTED_RULES(importResponse.success_count),
            dispatchToaster
          );
        }
        if (importResponse.errors.length > 0) {
          const formattedErrors = importResponse.errors.map(e =>
            i18n.IMPORT_FAILED_DETAILED(e.rule_id, e.error.status_code, e.error.message)
          );
          displayErrorToast(i18n.IMPORT_FAILED, formattedErrors, dispatchToaster);
        }

        importComplete();
        cleanupAndCloseModal();
      } catch (e) {
        cleanupAndCloseModal();
        displayErrorToast(i18n.IMPORT_FAILED, [e.message], dispatchToaster);
      }
    }
  }, [selectedFiles, overwrite]);

  const handleCloseModal = useCallback(() => {
    setSelectedFiles(null);
    closeModal();
  }, [closeModal]);

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
                checked={overwrite}
                onChange={() => setOverwrite(!overwrite)}
              />
            </EuiModalBody>

            <EuiModalFooter>
              <EuiButtonEmpty onClick={handleCloseModal}>{i18n.CANCEL_BUTTON}</EuiButtonEmpty>
              <EuiButton
                onClick={importRulesCallback}
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
};

ImportRuleModalComponent.displayName = 'ImportRuleModalComponent';

export const ImportRuleModal = React.memo(ImportRuleModalComponent);

ImportRuleModal.displayName = 'ImportRuleModal';
