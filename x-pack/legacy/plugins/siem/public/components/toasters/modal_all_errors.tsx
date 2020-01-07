/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiCallOut,
  EuiSpacer,
  EuiCodeBlock,
  EuiModalFooter,
  EuiAccordion,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { AppToast } from '.';
import * as i18n from './translations';

interface FullErrorProps {
  isShowing: boolean;
  toast: AppToast;
  toggle: (toast: AppToast) => void;
}

export const ModalAllErrors = ({ isShowing, toast, toggle }: FullErrorProps) =>
  isShowing && toast != null ? (
    <EuiOverlayMask>
      <EuiModal onClose={() => toggle(toast)}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.TITLE_ERROR_MODAL}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiCallOut color="danger" iconType="alert" size="s" title={toast.title} />
          <EuiSpacer size="s" />
          {toast.errors != null &&
            toast.errors.map((error, index) => (
              <EuiAccordion
                key={`${toast.id}-${index}`}
                buttonContent={error.length > 100 ? `${error.substring(0, 100)} ...` : error}
                data-test-subj="modal-all-errors-accordion"
                id="accordion1"
                initialIsOpen={index === 0 ? true : false}
              >
                <MyEuiCodeBlock>{error}</MyEuiCodeBlock>
              </EuiAccordion>
            ))}
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButton data-test-subj="modal-all-errors-close" fill onClick={() => toggle(toast)}>
            {i18n.CLOSE_ERROR_MODAL}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  ) : null;

const MyEuiCodeBlock = styled(EuiCodeBlock)`
  margin-top: 4px;
`;

MyEuiCodeBlock.displayName = 'MyEuiCodeBlock';
