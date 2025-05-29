/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiFieldPassword,
  EuiAccordion,
  EuiPanel,
  EuiTextColor,
  EuiFlyoutFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { Agent } from '../../../../types';
import { useMigrateSingleAgent } from '../../../../hooks';

interface Props {
  agents: Array<Agent | undefined>;
  onClose: () => void;
}

export const AgentMigrateFlyout: React.FC<Props> = ({ agents, onClose }) => {
  const migrateAgent = useMigrateSingleAgent;
  const [formValid, setFormValid] = React.useState(false);
  const [formContent, setFormContent] = React.useState({
    uri: '',
    enrollment_token: '',
  });

  useEffect(() => {
    const validateForm = () => {
      if (formContent.uri && formContent.enrollment_token) {
        setFormValid(true);
      } else {
        setFormValid(false);
      }
    };
    validateForm();
  }, [formContent]);

  const submitForm = () => {
    migrateAgent({ ...formContent, id: agents[0]?.id! });
    onClose();
  };

  return (
    <>
      <EuiFlyout size="s" onClose={onClose}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage
                id="xpack.fleet.agentList.migrateAgentFlyout.title"
                defaultMessage="Migrate Agent"
              />
            </h1>
          </EuiTitle>
          <EuiSpacer />
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentList.migrateAgentFlyout.title"
              defaultMessage="Move this Elastic Agent to a different Fleet server by specifying a new cluster URL and enrollment token."
            />
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiForm>
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.agentList.migrateAgentFlyout.clusterUrlLabel"
                  defaultMessage="Remote Cluster URL"
                />
              }
              helpText={
                <FormattedMessage
                  id="xpack.fleet.agentList.migrateAgentFlyout.clusterUrlHelpText"
                  defaultMessage="Enter the URL of the Fleet server in the target cluster you want the agent to migrate to"
                />
              }
            >
              <EuiFieldText
                placeholder={i18n.translate(
                  'xpack.fleet.agentList.migrateAgentFlyout.clusterUrlPlaceholder',
                  {
                    defaultMessage: 'Paste your cluster URL',
                  }
                )}
                fullWidth
                onChange={(e) => setFormContent({ ...formContent, uri: e.target.value })}
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.agentList.migrateAgentFlyout.enrollmentTokenLabel"
                  defaultMessage="Enrollment Token"
                />
              }
              helpText={
                <FormattedMessage
                  id="xpack.fleet.agentList.migrateAgentFlyout.enrollmentTokenHelpText"
                  defaultMessage="Paste a valid enrollment token generated in the target cluster"
                />
              }
            >
              <EuiFieldPassword
                onChange={(e) =>
                  setFormContent({ ...formContent, enrollment_token: e.target.value })
                }
                placeholder={i18n.translate(
                  'xpack.fleet.agentList.migrateAgentFlyout.enrollmentTokenPlaceholder',
                  {
                    defaultMessage: 'Paste/enter your enrollment token',
                  }
                )}
                fullWidth
              />
            </EuiFormRow>
            <EuiFormRow>
              <EuiAccordion
                arrowDisplay="right"
                id="migrateAgentFlyoutAdditionalOptions"
                initialIsOpen={true}
                buttonContent={
                  <EuiTextColor color="primary">
                    <FormattedMessage
                      id="xpack.inferenceEndpointUICommon.components.additionalInfo.additionalOptionsLabel"
                      defaultMessage="Additional options"
                    />
                  </EuiTextColor>
                }
              >
                <EuiPanel color="subdued" hasBorder={true}>
                  <EuiSpacer size="m" />
                </EuiPanel>
              </EuiAccordion>
            </EuiFormRow>
          </EuiForm>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiButtonEmpty onClick={onClose} data-test-subj="migrateAgentFlyoutCancelButton">
              <FormattedMessage
                id="xpack.fleet.agentList.migrateAgentFlyout.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
            <EuiButton
              disabled={!formValid}
              onClick={submitForm}
              fill
              data-test-subj="migrateAgentFlyoutSubmitButton"
            >
              <FormattedMessage
                id="xpack.fleet.agentList.migrateAgentFlyout.submitButtonLabel"
                defaultMessage="Migrate Agent"
              />
            </EuiButton>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
};
