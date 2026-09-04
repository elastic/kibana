/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { DeploymentMethod } from '../../aws_service_matrix';

// Re-export the canonical type from the matrix so all consumers use the same spelling.
export type { DeploymentMethod };

interface DeploymentMethodOption {
  value: DeploymentMethod;
  /** Label shown in the select dropdown */
  text: string;
  /** Short name shown bold in the card summary */
  name: string;
  /** Tagline shown after the name in the card summary */
  tagline: string;
}

const DEPLOYMENT_METHOD_OPTIONS: DeploymentMethodOption[] = [
  {
    value: 'managed_integration',
    text: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.deploymentMethod.managedIntegrations.selectText',
      { defaultMessage: 'Elastic Managed Integrations' }
    ),
    name: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.deploymentMethod.managedIntegrations.name',
      { defaultMessage: 'Elastic Managed Integration' }
    ),
    tagline: i18n.translate(
      'xpack.ingestHub.authenticateAndDeployStep.deploymentMethod.managedIntegrations.tagline',
      { defaultMessage: 'Simpler setup, no agent required.' }
    ),
  },
];

interface DeploymentMethodCardProps {
  selectedMethod: DeploymentMethod;
  onChange: (method: DeploymentMethod) => void;
}

export function DeploymentMethodCard({ selectedMethod, onChange }: DeploymentMethodCardProps) {
  const { euiTheme } = useEuiTheme();
  const modalTitleId = useGeneratedHtmlId();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftMethod, setDraftMethod] = useState<DeploymentMethod>(selectedMethod);

  const selectedOption = DEPLOYMENT_METHOD_OPTIONS.find((o) => o.value === selectedMethod)!;

  const panelCss = css`
    border: 1px solid ${euiTheme.colors.borderBaseSubdued};
  `;

  const openModal = () => {
    setDraftMethod(selectedMethod);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    onChange(draftMethod);
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <EuiPanel
        paddingSize="m"
        color="subdued"
        css={panelCss}
        data-test-subj="deploymentMethodCard"
      >
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="gear" size="m" color="subdued" aria-hidden />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.deploymentMethodCard.title"
                  defaultMessage="Deployment method"
                />
              </strong>
            </EuiText>
            <EuiText size="s">
              <strong>{selectedOption.name}.</strong> {selectedOption.tagline}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              onClick={openModal}
              data-test-subj="deploymentMethodCard-editButton"
            >
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.deploymentMethodCard.editButton"
                defaultMessage="Edit"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      {isModalOpen && (
        <EuiModal
          onClose={handleCancel}
          aria-labelledby={modalTitleId}
          data-test-subj="editDeploymentMethodModal"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.editDeploymentMethodModal.title"
                defaultMessage="Edit deployment method"
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.editDeploymentMethodModal.description"
                  defaultMessage="The deployment method determines how Elastic connects to and collects data from your AWS services."
                />
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiSelect
              options={DEPLOYMENT_METHOD_OPTIONS}
              value={draftMethod}
              onChange={(e) => setDraftMethod(e.target.value as DeploymentMethod)}
              aria-label={i18n.translate(
                'xpack.ingestHub.authenticateAndDeployStep.editDeploymentMethodModal.selectAriaLabel',
                { defaultMessage: 'Deployment method' }
              )}
              data-test-subj="editDeploymentMethodModal-select"
            />
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              onClick={handleCancel}
              data-test-subj="editDeploymentMethodModal-cancelButton"
            >
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.editDeploymentMethodModal.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
            <EuiButton
              fill
              onClick={handleSave}
              data-test-subj="editDeploymentMethodModal-saveButton"
            >
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.editDeploymentMethodModal.saveButton"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
}
