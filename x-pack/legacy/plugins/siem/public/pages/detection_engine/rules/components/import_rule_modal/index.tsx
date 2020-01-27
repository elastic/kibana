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
import { noop } from 'lodash/fp';
import React, { useCallback, useState } from 'react';
import { failure } from 'io-ts/lib/PathReporter';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import uuid from 'uuid';

import { duplicateRules, RulesSchema } from '../../../../../containers/detection_engine/rules';
import { useKibanaUiSetting } from '../../../../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../../../../common/constants';
import { useStateToaster } from '../../../../../components/toasters';
import { ndjsonToJSON } from '../json_downloader';
import * as i18n from './translations';

interface ImportRuleModalProps {
  showModal: boolean;
  closeModal: () => void;
  importComplete: () => void;
}

/**
 * Modal component for importing Rules from a json file
 *
 * @param filename name of file to be downloaded
 * @param payload JSON string to write to file
 *
 */
export const ImportRuleModalComponent = ({
  showModal,
  closeModal,
  importComplete,
}: ImportRuleModalProps) => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);
  const [, dispatchToaster] = useStateToaster();

  const cleanupAndCloseModal = () => {
    setIsImporting(false);
    setSelectedFiles(null);
    closeModal();
  };

  const importRules = useCallback(async () => {
    if (selectedFiles != null) {
      setIsImporting(true);
      const reader = new FileReader();
      reader.onload = async event => {
        // @ts-ignore type is string, not ArrayBuffer as FileReader.readAsText is called
        const importedRules = ndjsonToJSON(event?.target?.result ?? '');

        const decodedRules = pipe(
          RulesSchema.decode(importedRules),
          fold(errors => {
            cleanupAndCloseModal();
            dispatchToaster({
              type: 'addToaster',
              toast: {
                id: uuid.v4(),
                title: i18n.IMPORT_FAILED,
                color: 'danger',
                iconType: 'alert',
                errors: failure(errors),
              },
            });
            throw new Error(failure(errors).join('\n'));
          }, identity)
        );

        const duplicatedRules = await duplicateRules({ rules: decodedRules, kbnVersion });
        importComplete();
        cleanupAndCloseModal();

        dispatchToaster({
          type: 'addToaster',
          toast: {
            id: uuid.v4(),
            title: i18n.SUCCESSFULLY_IMPORTED_RULES(duplicatedRules.length),
            color: 'success',
            iconType: 'check',
          },
        });
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
                onChange={() => noop}
              />
            </EuiModalBody>

            <EuiModalFooter>
              <EuiButtonEmpty onClick={closeModal}>{i18n.CANCEL_BUTTON}</EuiButtonEmpty>
              <EuiButton onClick={importRules} disabled={selectedFiles == null || isImporting} fill>
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
