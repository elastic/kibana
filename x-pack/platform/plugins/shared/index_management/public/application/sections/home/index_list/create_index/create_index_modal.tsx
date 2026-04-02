/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiSuperSelect,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiHorizontalRule,
  EuiCodeBlock,
  type UseEuiTheme,
} from '@elastic/eui';

import { LOOKUP_INDEX_MODE, STANDARD_INDEX_MODE } from '../../../../../../common/constants';
import { indexModeDescriptions, indexModeLabels } from '../../../../lib/index_mode_labels';
import { createIndex } from '../../../../services';
import { notificationService } from '../../../../services/notification';

import { generateRandomIndexName, isValidIndexName } from './utils';

const INVALID_INDEX_NAME_ERROR = i18n.translate(
  'xpack.idxMgmt.createIndex.modal.invalidName.error',
  { defaultMessage: 'Index name is not valid' }
);

const modalHeaderStyles = ({ euiTheme }: UseEuiTheme) => css`
  flex-direction: column;
  align-items: flex-start;
  gap: ${euiTheme.size.s};
`;

export interface CreateIndexModalProps {
  closeModal: () => void;
  loadIndices: () => void;
}

export const CreateIndexModal = ({ closeModal, loadIndices }: CreateIndexModalProps) => {
  const modalTitleId = useGeneratedHtmlId();
  const { euiTheme } = useEuiTheme();

  const [indexName, setIndexName] = useState<string>(generateRandomIndexName);

  const [indexMode, setIndexMode] = useState<string>(STANDARD_INDEX_MODE);
  const [indexNameError, setIndexNameError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | undefined>();
  const [showApi, setShowApi] = useState(false);

  const apiCode = `PUT ${indexName}
{
  "settings": {
    "index":{
      "mode":"${indexMode}"
    }
  }
}`;

  const putCreateIndex = useCallback(async () => {
    setIsSaving(true);
    try {
      const { error } = await createIndex(indexName, indexMode);
      setIsSaving(false);
      if (!error) {
        notificationService.showSuccessToast(
          i18n.translate('xpack.idxMgmt.createIndex.successfullyCreatedIndexMessage', {
            defaultMessage: 'Successfully created index: {indexName}',
            values: { indexName },
          })
        );
        closeModal();
        loadIndices();
        return;
      }
      setCreateError(error.message);
    } catch (e) {
      setIsSaving(false);
      setCreateError(e.message);
    }
  }, [closeModal, indexMode, indexName, loadIndices]);

  const onSave = () => {
    if (isValidIndexName(indexName)) {
      putCreateIndex();
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSave();
  };

  const onNameChange = (name: string) => {
    setIndexName(name);
    if (!isValidIndexName(name)) {
      setIndexNameError(INVALID_INDEX_NAME_ERROR);
    } else if (indexNameError) {
      setIndexNameError(undefined);
    }
  };

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      onClose={closeModal}
      initialFocus="[name=indexName]"
      css={css`
        width: calc(${euiTheme.size.xxxl} * 16);
      `}
    >
      <EuiModalHeader css={modalHeaderStyles}>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="xpack.idxMgmt.createIndex.modal.header.title"
            defaultMessage="Create your index"
          />
        </EuiModalHeaderTitle>
        <EuiText color="subdued" size="s">
          <FormattedMessage
            id="xpack.idxMgmt.createIndex.modal.header.description"
            defaultMessage="An index stores and defines the schema of your data."
          />
        </EuiText>
      </EuiModalHeader>
      <EuiModalBody>
        {createError && (
          <>
            <EuiCallOut
              announceOnMount
              color="danger"
              iconType="error"
              title={i18n.translate('xpack.idxMgmt.createIndex.modal.error.title', {
                defaultMessage: 'Error creating index',
              })}
            >
              <EuiText>
                <FormattedMessage
                  id="xpack.idxMgmt.createIndex.modal.error.description"
                  defaultMessage="Error creating index: {errorMessage}"
                  values={{ errorMessage: createError }}
                />
              </EuiText>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}
        <EuiForm
          id="createIndexModalForm"
          component="form"
          onSubmit={handleFormSubmit}
          data-test-subj="createIndexModalForm"
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.idxMgmt.createIndex.modal.indexName.label', {
                  defaultMessage: 'Index name',
                })}
                isDisabled={isSaving}
                isInvalid={indexNameError !== undefined}
                error={indexNameError}
              >
                <EuiFieldText
                  isInvalid={indexNameError !== undefined}
                  fullWidth
                  name="indexName"
                  value={indexName}
                  onChange={(e) => onNameChange(e.target.value)}
                  data-test-subj="createIndexNameFieldText"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.idxMgmt.createIndex.modal.indexMode.label', {
                  defaultMessage: 'Index mode',
                })}
                isDisabled={isSaving}
                css={css`
                  width: calc(${euiTheme.size.xxxl} * 4);
                `}
              >
                <EuiSuperSelect
                  fullWidth
                  hasDividers
                  name="indexMode"
                  valueOfSelected={indexMode}
                  onChange={(mode) => setIndexMode(mode)}
                  data-test-subj="indexModeField"
                  options={[
                    {
                      value: STANDARD_INDEX_MODE,
                      inputDisplay: indexModeLabels[STANDARD_INDEX_MODE],
                      'data-test-subj': 'indexModeStandardOption',
                      dropdownDisplay: (
                        <Fragment>
                          <strong>{indexModeLabels[STANDARD_INDEX_MODE]}</strong>
                          <EuiText size="s" color="subdued">
                            <p>{indexModeDescriptions[STANDARD_INDEX_MODE]}</p>
                          </EuiText>
                        </Fragment>
                      ),
                    },
                    {
                      value: LOOKUP_INDEX_MODE,
                      inputDisplay: indexModeLabels[LOOKUP_INDEX_MODE],
                      'data-test-subj': 'indexModeLookupOption',
                      dropdownDisplay: (
                        <Fragment>
                          <strong>{indexModeLabels[LOOKUP_INDEX_MODE]}</strong>
                          <EuiText size="s" color="subdued">
                            <p>{indexModeDescriptions[LOOKUP_INDEX_MODE]}</p>
                          </EuiText>
                        </Fragment>
                      ),
                    },
                  ]}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiHorizontalRule margin="none" />
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup direction="column">
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiButtonEmpty
              onClick={closeModal}
              disabled={isSaving}
              data-test-subj="createIndexCancelButton"
              data-telemetry-id="idxMgmt-indexList-createIndex-cancelButton"
            >
              <FormattedMessage
                id="xpack.idxMgmt.createIndex.modal.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiButtonEmpty
                iconSide="left"
                iconType="code"
                disabled={isSaving}
                onClick={() => setShowApi((prev) => !prev)}
                data-test-subj="createIndexShowApiButton"
                data-telemetry-id="idxMgmt-indexList-createIndex-showApiButton"
              >
                {showApi ? (
                  <FormattedMessage
                    id="xpack.idxMgmt.createIndex.modal.hideApiButton"
                    defaultMessage="Hide API"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.idxMgmt.createIndex.modal.showApiButton"
                    defaultMessage="Show API"
                  />
                )}
              </EuiButtonEmpty>
              <EuiButton
                fill
                disabled={indexNameError !== undefined}
                isLoading={isSaving}
                type="submit"
                form="createIndexModalForm"
                data-test-subj="createIndexSaveButton"
                data-telemetry-id="idxMgmt-indexList-createIndex-saveButton"
              >
                <FormattedMessage
                  id="xpack.idxMgmt.createIndex.modal.saveIndexButton"
                  defaultMessage="Create my index"
                />
              </EuiButton>
            </EuiFlexGroup>
          </EuiFlexGroup>
          {showApi && (
            <EuiCodeBlock language="json" isCopyable data-test-subj="createIndexApiCodeBlock">
              {apiCode}
            </EuiCodeBlock>
          )}
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
