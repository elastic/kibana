/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

interface CreateAnalyticsModalProps {
  closeModal: () => void;
  createAnalyticsJob: () => void;
  isJobCreated: boolean;
  isJobStarted: boolean;
  isModalButtonDisabled: boolean;
  startAnalyticsJob: () => void;
  isValid: boolean;
}

export const CreateAnalyticsModal: FC<CreateAnalyticsModalProps> = ({
  children,
  closeModal,
  createAnalyticsJob,
  isJobCreated,
  isJobStarted,
  isModalButtonDisabled,
  startAnalyticsJob,
  isValid,
}) => (
  <EuiOverlayMask>
    <EuiModal onClose={closeModal} initialFocus="[name=popswitch]">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.ml.dataframe.analytics.create.modalHeaderTitle', {
            defaultMessage: 'Create data frame analytics job',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>{children}</EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeModal}>Cancel</EuiButtonEmpty>

        {!isJobCreated && (
          <EuiButton disabled={!isValid || isModalButtonDisabled} onClick={createAnalyticsJob} fill>
            Create
          </EuiButton>
        )}
        {isJobCreated && (
          <EuiButton
            disabled={isJobStarted || isModalButtonDisabled}
            onClick={startAnalyticsJob}
            fill
          >
            Start
          </EuiButton>
        )}
      </EuiModalFooter>
    </EuiModal>
  </EuiOverlayMask>
);
