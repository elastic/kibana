/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { WithGuidedOnboardingTour } from '../../../../../../../components';
import { useIsGuidedOnboardingActive } from '../../../../../../../hooks';
import type { PackageInfo } from '../../../../../types';

const toTitleCase = (str: string) => str.charAt(0).toUpperCase() + str.substr(1);

export const PostInstallAddAgentModal: React.FunctionComponent<{
  onConfirm: () => void;
  onCancel: () => void;
  packageInfo: PackageInfo;
}> = ({ onConfirm, onCancel, packageInfo }) => {
  const isGuidedOnboardingActive = useIsGuidedOnboardingActive(packageInfo.name);
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiModal
      data-test-subj="postInstallAddAgentModal"
      onClose={onCancel}
      aria-labelledby={modalTitleId}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="confirmModalTitleText" id={modalTitleId}>
          <FormattedMessage
            id="xpack.fleet.agentPolicy.postInstallAddAgentModal"
            defaultMessage="{packageName} integration added"
            values={{
              packageName: toTitleCase(packageInfo.title),
            }}
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText data-test-subj="confirmModalBodyText">
          <p>
            <FormattedMessage
              id="xpack.fleet.agentPolicy.postInstallAddAgentModalDescription"
              defaultMessage="To complete this integration, add {elasticAgent} to your hosts to collect data and send it to Elastic Stack."
              values={{
                elasticAgent: <strong>Elastic Agent</strong>,
              }}
            />
          </p>
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="confirmModalCancelButton" onClick={onCancel}>
          <FormattedMessage
            id="xpack.fleet.agentPolicy.postInstallAddAgentModalCancelButtonLabel"
            defaultMessage="Add Elastic Agent later"
          />
        </EuiButtonEmpty>

        <WithGuidedOnboardingTour
          packageKey={packageInfo.name}
          tourType="agentModalButton"
          isTourVisible={isGuidedOnboardingActive}
          tourPosition="downCenter"
          tourOffset={-20}
        >
          <EuiButton
            data-test-subj="confirmModalConfirmButton"
            onClick={onConfirm}
            fill
            color="primary"
          >
            <FormattedMessage
              id="xpack.fleet.agentPolicy.postInstallAddAgentModalConfirmButtonLabel"
              defaultMessage="Add Elastic Agent to your hosts"
            />
          </EuiButton>
        </WithGuidedOnboardingTour>
      </EuiModalFooter>
    </EuiModal>
  );
};
