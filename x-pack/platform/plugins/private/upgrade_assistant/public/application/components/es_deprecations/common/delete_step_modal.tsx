/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFormRow,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiCode,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';

interface Props {
  closeModal: () => void;
  targetName?: string;
  deleteIndex: () => void;
  type: 'index' | 'dataStream';
}

export const DeleteModal = ({ closeModal, targetName, deleteIndex, type }: Props) => {
  const i18nTexts = {
    index: {
      deleteTitle: (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.deleteModal.index.titleLabel"
          defaultMessage="Delete index"
        />
      ),
      calloutTitle: (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.deleteModal.index.calloutTitle"
          defaultMessage="Deleting index cannot be reversed"
        />
      ),
      calloutText: (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.deleteModal.calloutText"
          defaultMessage="You are about to delete index {targetName}. This is an irreversible action, and the data cannot be recovered from a deleted index. Make sure you have appropriate backups."
          values={{
            targetName: <EuiCode>{targetName}</EuiCode>,
          }}
        />
      ),
      deleteButtonLabel: (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.deleteModal.index.deleteButtonLabel"
          defaultMessage="Delete index"
        />
      ),
    },

    dataStream: {
      deleteTitle: (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.dataStreams.deleteModal.dataStream.titleLabel"
          defaultMessage="Delete data stream"
        />
      ),
      calloutTitle: (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.dataStreams.deleteModal.dataStream.calloutTitle"
          defaultMessage="Deleting data stream cannot be reversed"
        />
      ),
      calloutText: (
        <>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.dataStreams.deleteModal.dataStream.calloutText1"
              defaultMessage="You are about to delete data stream {targetName}. This is an irreversible action, and the data cannot be recovered from a deleted data stream. Make sure you have appropriate backups."
              values={{
                targetName: <EuiCode>{targetName}</EuiCode>,
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.dataStreams.deleteModal.dataStream.calloutText2"
              defaultMessage="Data streams are collections of time series indices. Deleting a data stream will also delete its indices."
            />
          </p>
        </>
      ),
      deleteButtonLabel: (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.dataStreams.deleteModal.dataStream.deleteButtonLabel"
          defaultMessage="Delete data stream"
        />
      ),
    },
  };

  const [inputValue, setInputValue] = useState<string>('');

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle
          data-test-subj={type === 'index' ? 'updateIndexModalTitle' : 'dataStreamModalTitle'}
          size="m"
        >
          {i18nTexts[type].deleteTitle}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCallOut title={i18nTexts[type].calloutTitle} color="warning" iconType="warning">
          {i18nTexts[type].calloutText}
        </EuiCallOut>
        <EuiSpacer size="m" />
        <EuiFormRow label="Type the word 'delete' to confirm" fullWidth={true}>
          <EuiFieldText
            name="delete"
            value={inputValue}
            onChange={onChange}
            fullWidth={true}
            data-test-subj="deleteIndexInput"
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiButtonEmpty
            onClick={() => {
              setInputValue('');
              closeModal();
            }}
            color="primary"
            data-test-subj="closeUpdateStepButton"
          >
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.deleteModal.closeButtonLabel"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>
          <EuiButton
            fill
            onClick={() => {
              setInputValue('');
              deleteIndex();
            }}
            disabled={inputValue.toLowerCase() !== 'delete'}
            data-test-subj="startDeleteButton"
            color="danger"
          >
            {i18nTexts[type].deleteButtonLabel}
          </EuiButton>
        </EuiFlexGroup>
      </EuiModalFooter>
    </>
  );
};
