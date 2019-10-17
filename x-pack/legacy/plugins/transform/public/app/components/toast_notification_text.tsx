/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, FC } from 'react';

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

const MAX_SIMPLE_MESSAGE_LENGTH = 140;

export const ToastNotificationText: FC<{ text: any }> = ({ text }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  if (typeof text === 'string' && text.length <= MAX_SIMPLE_MESSAGE_LENGTH) {
    return text;
  }

  if (
    typeof text === 'object' &&
    typeof text.message === 'string' &&
    text.message.length <= MAX_SIMPLE_MESSAGE_LENGTH
  ) {
    return text.message;
  }

  const formattedText = text.message ? text.message : JSON.stringify(text, null, 2);

  const openModal = () => setIsModalVisible(true);
  const closeModal = () => setIsModalVisible(false);

  return (
    <>
      <EuiButtonEmpty onClick={openModal}>
        {i18n.translate('xpack.transform.toastText.openModalButtonText', {
          defaultMessage: 'View details',
        })}
      </EuiButtonEmpty>
      {isModalVisible && (
        <EuiOverlayMask>
          <EuiModal onClose={closeModal}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                {i18n.translate('xpack.transform.toastText.modalTitle', {
                  defaultMessage: 'Error details',
                })}
              </EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <EuiCodeBlock language="json" fontSize="m" paddingSize="s" isCopyable>
                {formattedText}
              </EuiCodeBlock>
            </EuiModalBody>
            <EuiModalFooter>
              <EuiButtonEmpty onClick={closeModal}>
                {i18n.translate('xpack.transform.toastText.closeModalButtonText', {
                  defaultMessage: 'Close',
                })}
              </EuiButtonEmpty>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </>
  );
};
