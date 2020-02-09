/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { npStart } from 'ui/new_platform';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';

const MAX_SIMPLE_MESSAGE_LENGTH = 140;

export const ToastNotificationText: FC<{ text: any }> = ({ text }) => {
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

  const unformattedText = text.message ? text.message : text;
  const formattedText = typeof unformattedText === 'object' ? JSON.stringify(text, null, 2) : text;
  const previewText = `${formattedText.substring(0, 140)}${
    formattedText.length > 140 ? ' ...' : ''
  }`;

  const openModal = () => {
    const modal = npStart.core.overlays.openModal(
      toMountPoint(
        <EuiModal onClose={() => modal.close()}>
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
            <EuiButtonEmpty onClick={() => modal.close()}>
              {i18n.translate('xpack.transform.toastText.closeModalButtonText', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiModalFooter>
        </EuiModal>
      )
    );
  };

  return (
    <>
      <pre>{previewText}</pre>
      <EuiButtonEmpty onClick={openModal}>
        {i18n.translate('xpack.transform.toastText.openModalButtonText', {
          defaultMessage: 'View details',
        })}
      </EuiButtonEmpty>
    </>
  );
};
