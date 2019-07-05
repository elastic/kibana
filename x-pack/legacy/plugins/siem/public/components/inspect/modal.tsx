/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiCodeBlock,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiOverlayMask,
  EuiSpacer,
  EuiTabbedContent,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import * as i18n from './translations';

interface ModalInspectProps {
  closeModal: () => void;
  isShowing: boolean;
  request: string | null;
  response: string | null;
  title: string | React.ReactElement | React.ReactNode;
}

const MyEuiModal = styled(EuiModal)`
  .euiModal__flex {
    width: 60vw;
  }
  .euiCodeBlock {
    height: auto !important;
    max-width: 718px;
  }
`;

export const ModalInspectQuery = ({
  closeModal,
  isShowing = false,
  request,
  response,
  title,
}: ModalInspectProps) => {
  if (!isShowing || request == null || response == null) {
    return null;
  }
  const tabs = [
    {
      id: 'request',
      name: 'Request',
      content: (
        <>
          <EuiSpacer />
          <EuiCodeBlock
            language="js"
            fontSize="m"
            paddingSize="m"
            color="dark"
            overflowHeight={300}
            isCopyable
          >
            {request}
          </EuiCodeBlock>
        </>
      ),
    },
    {
      id: 'response',
      name: 'Response',
      content: (
        <>
          <EuiSpacer />
          <EuiCodeBlock
            language="js"
            fontSize="m"
            paddingSize="m"
            color="dark"
            overflowHeight={300}
            isCopyable
          >
            {response}
          </EuiCodeBlock>
        </>
      ),
    },
  ];

  return (
    <EuiOverlayMask>
      <MyEuiModal onClose={closeModal} data-test-subj="modal-inspect-euiModal">
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {i18n.INSPECT} {title}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[1]} autoFocus="selected" />
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButton onClick={closeModal} fill data-test-subj="modal-inspect-close">
            {i18n.CLOSE}
          </EuiButton>
        </EuiModalFooter>
      </MyEuiModal>
    </EuiOverlayMask>
  );
};
