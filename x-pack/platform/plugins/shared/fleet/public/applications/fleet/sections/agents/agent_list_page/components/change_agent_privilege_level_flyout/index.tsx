/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { ChangeAgentPrivilegeLevelRequest } from '../../../../../../../../common/types';
import type { Agent } from '../../../../../types';
import {
  sendBulkChangeAgentPrivilegeLevel,
  sendChangeAgentPrivilegeLevel,
  useFleetStatus,
  useStartServices,
} from '../../../../../../../hooks';

import { SecretFormRow } from './action_secret_form_row';

interface Props {
  agents: Agent[] | string;
  agentCount: number;
  unsupportedAgents: Agent[];
  onClose: () => void;
  onSave: () => void;
}

export const ChangeAgentPrivilegeLevelFlyout: React.FC<Props> = ({
  agents,
  agentCount,
  unsupportedAgents,
  onClose,
  onSave,
}) => {
  const { notifications } = useStartServices();
  const isActionSecretsStorageEnabled = useFleetStatus().isActionSecretsStorageEnabled ?? false;

  const changeAgentPrivilegeLevel = sendChangeAgentPrivilegeLevel;
  const changeAgentsPrivilegeLevel = sendBulkChangeAgentPrivilegeLevel;

  const [formContent, setFormContent] = useState<ChangeAgentPrivilegeLevelRequest['body']>(null);

  const flyoutTitleId = useGeneratedHtmlId();

  const filteredAgents = useMemo(
    () =>
      Array.isArray(agents)
        ? agents.filter((agent) => !unsupportedAgents.some((a) => a.id === agent.id))
        : agents,
    [agents, unsupportedAgents]
  );
  const filteredAgentCount = useMemo(
    () => (Array.isArray(filteredAgents) ? filteredAgents.length : agentCount),
    [agentCount, filteredAgents]
  );

  const handleFormChange = (key: string, value: string) => {
    if (formContent === null) {
      setFormContent({ user_info: { [key]: value } });
    } else {
      setFormContent({
        user_info: {
          ...formContent.user_info,
          [key]: value,
        },
      });
    }
  };

  const submitForm = async () => {
    try {
      if (Array.isArray(filteredAgents)) {
        if (filteredAgents.length === 1) {
          await changeAgentPrivilegeLevel({ agentId: filteredAgents[0].id, body: formContent });
        } else {
          await changeAgentsPrivilegeLevel({
            body: { agents: filteredAgents.map((agent) => agent.id), ...formContent },
          });
        }
      } else {
        await changeAgentsPrivilegeLevel({
          body: { agents: filteredAgents, ...formContent },
        });
      }
      notifications.toasts.addSuccess({
        title: i18n.translate(
          'xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.successNotificationTitle',
          {
            defaultMessage: 'Agent privilege level change initiated',
          }
        ),
        text: i18n.translate(
          'xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.successNotificationDescription',
          {
            defaultMessage:
              'The agent privilege level change process has been successfully initiated.',
          }
        ),
      });
      onSave();
    } catch (e) {
      notifications.toasts.addError(e, {
        title: i18n.translate(
          'xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.errorNotificationTitle',
          {
            defaultMessage:
              'Failed to change privilege level for {agentCount, plural, one {agent} other {agents}}',
            values: {
              agentCount: filteredAgentCount,
            },
          }
        ),
        toastMessage: i18n.translate(
          'xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.errorNotificationDescription',
          {
            defaultMessage: 'The agent privilege level change process has failed.',
          }
        ),
      });
    }
  };

  return (
    <>
      <EuiFlyout
        data-test-subj="changeAgentPrivilegeLevelFlyout"
        onClose={onClose}
        aria-labelledby={flyoutTitleId}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="l">
            <h1 id={flyoutTitleId}>
              <FormattedMessage
                id="xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.title"
                defaultMessage="Remove {agentCount, plural, one {agent} other {agents}} root privilege"
                values={{
                  agentCount: filteredAgentCount,
                }}
              />
            </h1>
          </EuiTitle>
          <EuiSpacer />
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.description"
              defaultMessage="Change the privilege level of {agentCount, plural, one {this agent} other {these agents}} to unprivileged."
              values={{
                agentCount: filteredAgentCount,
              }}
            />
          </EuiText>
          {Array.isArray(agents) && unsupportedAgents.length > 0 && (
            <>
              <EuiSpacer />
              <EuiPanel color="warning" data-test-subj="changeAgentPrivilegeLevelFlyoutAlertPanel">
                <EuiText color="warning" className="eui-alignMiddle">
                  <FormattedMessage
                    id="xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.warning"
                    defaultMessage="{icon} Root privilege cannot be removed for {x} of {y} selected agents. These agents are either Fleet Server agents, already unprivileged agents, or agents on an unsupported version."
                    values={{
                      icon: <EuiIcon type="warning" />,
                      x: unsupportedAgents.length,
                      y: agentCount,
                    }}
                  />
                </EuiText>

                <EuiAccordion
                  id="changeAgentPrivilegeLevelFlyoutWarningAccordion"
                  buttonContent={
                    <EuiButtonEmpty onClick={() => {}} aria-label="View hosts">
                      <FormattedMessage
                        id="xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.warningAccordion"
                        defaultMessage="View hosts"
                      />
                    </EuiButtonEmpty>
                  }
                  initialIsOpen={false}
                >
                  <EuiSpacer size="s" />
                  <EuiText>
                    <ul>
                      {unsupportedAgents.map((agent) => (
                        <li key={agent.id}>{agent.local_metadata?.host?.hostname}</li>
                      ))}
                    </ul>
                  </EuiText>
                </EuiAccordion>
              </EuiPanel>
            </>
          )}
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiForm>
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.usernameLabel"
                  defaultMessage="Username (optional)"
                />
              }
              helpText={
                <FormattedMessage
                  id="xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.usernameHelpText"
                  defaultMessage="The username of the user that runs the Elastic Agent"
                />
              }
            >
              <EuiFieldText
                placeholder={i18n.translate(
                  'xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.usernamePlaceholder',
                  {
                    defaultMessage: 'Specify username',
                  }
                )}
                fullWidth
                onChange={(e) => handleFormChange('username', e.target.value)}
                data-test-subj="changeAgentPrivilegeLevelFlyout.usernameInput"
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.userGroupLabel"
                  defaultMessage="User group (optional)"
                />
              }
              helpText={
                <FormattedMessage
                  id="xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.userGroupHelpText"
                  defaultMessage="The group of the user that runs the Elastic Agent"
                />
              }
            >
              <EuiFieldText
                placeholder={i18n.translate(
                  'xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.userGroupPlaceholder',
                  {
                    defaultMessage: 'Specify user group',
                  }
                )}
                fullWidth
                onChange={(e) => handleFormChange('groupname', e.target.value)}
                data-test-subj="changeAgentPrivilegeLevelFlyout.userGroupInput"
              />
            </EuiFormRow>
            <SecretFormRow
              fullWidth
              useSecretsStorage={isActionSecretsStorageEnabled}
              secretLabelTitle={i18n.translate(
                'xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.passwordLabel',
                {
                  defaultMessage: 'User password (optional)',
                }
              )}
              plainTextLabel={
                <FormattedMessage
                  id="xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.passwordLabel"
                  defaultMessage="User password (optional)"
                />
              }
              additionalHelpText={i18n.translate(
                'xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.userPasswordHelpText',
                {
                  defaultMessage: 'The password of the user that runs the Elastic Agent',
                }
              )}
            >
              <EuiFieldPassword
                fullWidth
                type="dual"
                data-test-subj="agentPrivilegeFlyout.passwordSecretInput"
                onChange={(e) => handleFormChange('password', e.target.value)}
                placeholder={i18n.translate(
                  'xpack.fleet.settings.agentPrivilegeFlyout.passwordPlaceholder',
                  {
                    defaultMessage: 'Specify user password',
                  }
                )}
              />
            </SecretFormRow>
          </EuiForm>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiButtonEmpty
              aria-label="Cancel"
              onClick={onClose}
              data-test-subj="changeAgentPrivilegeLevelFlyoutCancelButton"
            >
              <FormattedMessage
                id="xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
            <EuiButton
              onClick={submitForm}
              fill
              disabled={filteredAgentCount === 0}
              data-test-subj="changeAgentPrivilegeLevelFlyoutSubmitButton"
            >
              <FormattedMessage
                id="xpack.fleet.agentList.changeAgentPrivilegeLevelFlyout.submitButtonLabel"
                defaultMessage="Remove privilege for {agentCount, plural, one {# agent} other {# agents}}"
                values={{ agentCount: filteredAgentCount }}
              />
            </EuiButton>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
};
