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
  EuiTextArea,
  EuiSwitch,
  EuiFlexItem,
  EuiIcon,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type {
  MigrateSingleAgentRequest,
  BulkMigrateAgentsRequest,
} from '../../../../../../../../common/types';

import type { Agent } from '../../../../../types';

import {
  useMigrateSingleAgent,
  useBulkMigrateAgents,
  useStartServices,
} from '../../../../../hooks';

import { HeadersInput } from './headers_input';

interface Props {
  agents: Agent[];
  onClose: () => void;
  onSave: () => void;
  protectedAndFleetAgents: Agent[];
}

export const AgentMigrateFlyout: React.FC<Props> = ({
  agents,
  onClose,
  onSave,
  protectedAndFleetAgents,
}) => {
  const { notifications } = useStartServices();
  const migrateAgent = useMigrateSingleAgent;
  const migrateAgents = useBulkMigrateAgents;
  const [formValid, setFormValid] = React.useState(false);
  const [validClusterURL, setValidClusterURL] = React.useState(false);
  const [formContent, setFormContent] = React.useState<
    MigrateSingleAgentRequest['body'] | BulkMigrateAgentsRequest['body']
  >({
    id: '',
    agents: [],
    uri: '',
    enrollment_token: '',
    settings: {},
  });

  const flyoutTitleId = useGeneratedHtmlId();

  useEffect(() => {
    const validateForm = () => {
      if (formContent.uri && formContent.enrollment_token && validClusterURL) {
        setFormValid(true);
      } else {
        setFormValid(false);
      }
    };

    const validateClusterURL = () => {
      if (formContent.uri) {
        // check that the uri matches a valid URI schema using URL constructor
        try {
          new URL(formContent.uri);
          setValidClusterURL(true);
        } catch (e) {
          setValidClusterURL(false);
        }
      } else {
        setValidClusterURL(false);
      }
    };

    validateClusterURL();
    validateForm();
  }, [formContent, validClusterURL]);

  const submitForm = () => {
    try {
      if (agents.length === 1) {
        migrateAgent({ ...formContent, id: agents[0].id });
      } else {
        migrateAgents({ ...formContent, agents: agents.map((agent) => agent.id) });
      }
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.fleet.agentList.migrateAgentFlyout.successNotificationTitle', {
          defaultMessage: 'Agent migration initiated',
        }),
        text: i18n.translate(
          'xpack.fleet.agentList.migrateAgentFlyout.successNotificationDescription',
          {
            defaultMessage: 'The agent migration process has been successfully initiated.',
          }
        ),
      });
      onSave();
    } catch (e) {
      notifications.toasts.addError(e, {
        title: i18n.translate('xpack.fleet.agentList.migrateAgentFlyout.errorNotificationTitle', {
          defaultMessage: 'Failed to migrate agent',
        }),
        toastMessage: i18n.translate(
          'xpack.fleet.agentList.migrateAgentFlyout.errorNotificationDescription',
          {
            defaultMessage: 'The agent migration process has failed.',
          }
        ),
      });
    }
  };

  return (
    <>
      <EuiFlyout data-test-subj="migrateAgentFlyout" onClose={onClose} aria-labelledby={flyoutTitleId}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="l">
            <h1 id={flyoutTitleId}>
              <FormattedMessage
                id="xpack.fleet.agentList.migrateAgentFlyout.title"
                defaultMessage="Migrate {agentCount, plural, one {agent} other {agents}}"
                values={{
                  agentCount: agents.length,
                }}
              />
            </h1>
          </EuiTitle>
          <EuiSpacer />
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentList.migrateAgentFlyout.title"
              defaultMessage="Move {agentCount, plural, one {this agent} other {these agents}} to a different Fleet Server by specifying a new cluster URL and enrollment token."
              values={{
                agentCount: agents.length,
              }}
            />
          </EuiText>

          {protectedAndFleetAgents.length > 0 && (
            <>
              <EuiSpacer />
              <EuiPanel color="warning" data-test-subj="migrateAgentFlyoutAlertPanel">
                <EuiText color="warning" className="eui-alignMiddle">
                  <FormattedMessage
                    id="xpack.fleet.agentList.migrateAgentFlyout.warning"
                    defaultMessage="{icon} {x} of {y} selected agents cannot be migrated as they are tamper protected or Fleet Server agents."
                    values={{
                      icon: <EuiIcon type="warning" />,
                      x: protectedAndFleetAgents.length,
                      y: agents.length + protectedAndFleetAgents.length,
                    }}
                  />
                </EuiText>

                <EuiAccordion
                  id="migrateAgentFlyoutWarningAccordion"
                  buttonContent={
                    <EuiButtonEmpty onClick={() => {}}>
                      <FormattedMessage
                        id="xpack.fleet.agentList.migrateAgentFlyout.warningAccordion"
                        defaultMessage="View Hosts"
                      />
                    </EuiButtonEmpty>
                  }
                  initialIsOpen={false}
                >
                  <EuiSpacer size="s" />
                  <EuiText>
                    <ul>
                      {protectedAndFleetAgents.map((agent) => (
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
              isInvalid={!validClusterURL && formContent.uri !== ''}
              error={
                <FormattedMessage
                  id="xpack.fleet.agentList.migrateAgentFlyout.clusterUrlError"
                  defaultMessage="Invalid cluster URL"
                />
              }
            >
              <EuiFieldText
                placeholder={i18n.translate(
                  'xpack.fleet.agentList.migrateAgentFlyout.clusterUrlPlaceholder',
                  {
                    defaultMessage: 'Enter a valid cluster URL',
                  }
                )}
                fullWidth
                onChange={(e) => setFormContent({ ...formContent, uri: e.target.value })}
                data-test-subj="migrateAgentFlyoutClusterUrlInput"
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
                  defaultMessage="Enter a valid enrollment token generated in the target cluster"
                />
              }
            >
              <EuiFieldPassword
                data-test-subj="migrateAgentFlyoutEnrollmentTokenInput"
                onChange={(e) =>
                  setFormContent({ ...formContent, enrollment_token: e.target.value })
                }
                placeholder={i18n.translate(
                  'xpack.fleet.agentList.migrateAgentFlyout.enrollmentTokenPlaceholder',
                  {
                    defaultMessage: 'Enter a valid enrollment token',
                  }
                )}
                fullWidth
              />
            </EuiFormRow>
            <EuiSpacer size="m" />

            {/* Additional Settings Section */}
            <EuiFormRow fullWidth>
              <EuiAccordion
                arrowDisplay="right"
                id="migrateAgentFlyoutAdditionalOptions"
                initialIsOpen={false}
                buttonContent={
                  <EuiButtonEmpty>
                    <FormattedMessage
                      id="xpack.fleet.agentList.migrateAgentFlyout.additionalOptionsLabel"
                      defaultMessage="Advanced options"
                    />
                  </EuiButtonEmpty>
                }
              >
                <EuiPanel color="subdued" hasBorder={true}>
                  {/* TLS and Certs Section */}
                  <EuiAccordion
                    id="tlsCertsSection"
                    initialIsOpen={true}
                    buttonContent={
                      <EuiTextColor color="primary">
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.tlsCertsLabel"
                          defaultMessage="TLS & Certs"
                        />
                      </EuiTextColor>
                    }
                  >
                    <EuiText color="subdued" size="s">
                      <FormattedMessage
                        id="xpack.fleet.agentList.migrateAgentFlyout.tlsCertsDescriptionLabel"
                        defaultMessage="Provide optional TLS settings if your target Fleet server uses custom certificates."
                      />
                    </EuiText>

                    <EuiSpacer size="m" />
                    <EuiFormRow label="ca_sha256" fullWidth>
                      <EuiFieldText
                        fullWidth
                        onChange={(e) =>
                          setFormContent({
                            ...formContent,
                            settings: { ...formContent.settings, ca_sha256: e.target.value },
                          })
                        }
                      />
                    </EuiFormRow>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.certAuthLabel"
                          defaultMessage="Certificate Authorities"
                        />
                      }
                      fullWidth
                    >
                      <EuiFieldText
                        fullWidth
                        onChange={(e) =>
                          setFormContent({
                            ...formContent,
                            settings: {
                              ...formContent.settings,
                              certificate_authorities: e.target.value,
                            },
                          })
                        }
                      />
                    </EuiFormRow>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.elasticAgentCertLabel"
                          defaultMessage="Elastic Agent Certificate"
                        />
                      }
                      fullWidth
                    >
                      <EuiTextArea
                        onChange={(e) =>
                          setFormContent({
                            ...formContent,
                            settings: {
                              ...formContent.settings,
                              elastic_agent_cert: e.target.value,
                            },
                          })
                        }
                        fullWidth
                      />
                    </EuiFormRow>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.elasticAgentCertKeyLabel"
                          defaultMessage="Elastic Agent Certificate Key"
                        />
                      }
                      fullWidth
                    >
                      <EuiTextArea
                        onChange={(e) =>
                          setFormContent({
                            ...formContent,
                            settings: {
                              ...formContent.settings,
                              elastic_agent_cert_key: e.target.value,
                            },
                          })
                        }
                        fullWidth
                      />
                    </EuiFormRow>
                  </EuiAccordion>
                  <EuiSpacer size="m" />
                  {/* Headers Section */}
                  <EuiAccordion
                    id="headersSection"
                    initialIsOpen={true}
                    buttonContent={
                      <EuiTextColor color="primary">
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.headersMainLabel"
                          defaultMessage="Headers"
                        />
                      </EuiTextColor>
                    }
                  >
                    <EuiText color="subdued" size="s">
                      <FormattedMessage
                        id="xpack.fleet.agentList.migrateAgentFlyout.headersDescriptionLabel"
                        defaultMessage="Custom HTTP headers sent during agent enrollment."
                      />
                    </EuiText>
                    <EuiSpacer size="m" />
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.headersLabel"
                          defaultMessage="Headers"
                        />
                      }
                      fullWidth
                    >
                      <HeadersInput
                        headers={formContent.settings?.headers || {}}
                        onUpdate={(headers) =>
                          setFormContent({
                            ...formContent,
                            settings: {
                              ...formContent.settings,
                              headers,
                            },
                          })
                        }
                      />
                    </EuiFormRow>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.proxyHeadersLabel"
                          defaultMessage="Proxy Headers"
                        />
                      }
                      fullWidth
                    >
                      <HeadersInput
                        headers={formContent.settings?.proxy_headers || {}}
                        onUpdate={(headers) =>
                          setFormContent({
                            ...formContent,
                            settings: {
                              ...formContent.settings,
                              proxy_headers: headers,
                            },
                          })
                        }
                      />
                    </EuiFormRow>
                  </EuiAccordion>
                  <EuiSpacer size="m" />
                  {/* Networking section */}
                  <EuiAccordion
                    id="networkingSection"
                    initialIsOpen={true}
                    buttonContent={
                      <EuiTextColor color="primary">
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.networkingLabel"
                          defaultMessage="Networking"
                        />
                      </EuiTextColor>
                    }
                  >
                    <EuiText color="subdued" size="s">
                      <FormattedMessage
                        id="xpack.fleet.agentList.migrateAgentFlyout.networkingDescriptionLabel"
                        defaultMessage="Configure proxy settings if your network requires routing traffic through a proxy server."
                      />
                    </EuiText>
                    <EuiSpacer size="m" />
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.proxyUrlLabel"
                          defaultMessage="Proxy URL"
                        />
                      }
                      fullWidth
                    >
                      <EuiFieldText
                        fullWidth
                        onChange={(e) =>
                          setFormContent({
                            ...formContent,
                            settings: { ...formContent.settings, proxy_url: e.target.value },
                          })
                        }
                      />
                    </EuiFormRow>
                  </EuiAccordion>

                  <EuiSpacer size="m" />
                  {/* Agent Options Section */}
                  <EuiAccordion
                    id="headersSection"
                    initialIsOpen={true}
                    buttonContent={
                      <EuiTextColor color="primary">
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.agentOptionsLabel"
                          defaultMessage="Agent Options"
                        />
                      </EuiTextColor>
                    }
                  >
                    <EuiText color="subdued" size="s">
                      <FormattedMessage
                        id="xpack.fleet.agentList.migrateAgentFlyout.agentOptionsDescriptionLabel"
                        defaultMessage="Customize behavior during migration. Control connection handling, staging environments, and token replacement logic."
                      />
                    </EuiText>
                    <EuiSpacer size="m" />
                    <EuiFormRow fullWidth>
                      <EuiFlexGroup alignItems="flexStart">
                        <EuiFlexItem>
                          <EuiSwitch
                            label={
                              <FormattedMessage
                                id="xpack.fleet.agentList.migrateAgentFlyout.insecurelabel"
                                defaultMessage="Insecure"
                              />
                            }
                            checked={formContent.settings?.insecure ?? false}
                            onChange={(e) =>
                              setFormContent({
                                ...formContent,
                                settings: { ...formContent.settings, insecure: e.target.checked },
                              })
                            }
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiSwitch
                            label={
                              <FormattedMessage
                                id="xpack.fleet.agentList.migrateAgentFlyout.stagingLabel"
                                defaultMessage="Staging"
                              />
                            }
                            checked={formContent.settings?.staging ?? false}
                            onChange={(e) =>
                              setFormContent({
                                ...formContent,
                                settings: { ...formContent.settings, staging: e.target.checked },
                              })
                            }
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFormRow>
                    <EuiFormRow fullWidth>
                      <EuiFlexGroup justifyContent="spaceBetween">
                        <EuiFlexItem>
                          <EuiSwitch
                            label={
                              <FormattedMessage
                                id="xpack.fleet.agentList.migrateAgentFlyout.proxyLabel"
                                defaultMessage="Proxy Disabled"
                              />
                            }
                            checked={formContent.settings?.proxy_disabled ?? false}
                            onChange={(e) =>
                              setFormContent({
                                ...formContent,
                                settings: {
                                  ...formContent.settings,
                                  proxy_disabled: e.target.checked,
                                },
                              })
                            }
                          />
                        </EuiFlexItem>
                        {/* Replace token shouldnt be an option when bulk migrating */}
                        {agents.length === 1 && (
                          <EuiFlexItem>
                            <EuiSwitch
                              data-test-subj="migrateAgentFlyoutReplaceTokenButton"
                              label={
                                <FormattedMessage
                                  id="xpack.fleet.agentList.migrateAgentFlyout.replaceTokenLabel"
                                  defaultMessage="Replace Token"
                                />
                              }
                              checked={
                                (
                                  formContent.settings as MigrateSingleAgentRequest['body']['settings']
                                )?.replace_token ?? false
                              }
                              onChange={(e) => {
                                // Only allow setting replace_token when migrating a single agent
                                if ('id' in formContent) {
                                  setFormContent({
                                    ...formContent,
                                    settings: {
                                      ...formContent.settings,
                                      replace_token: e.target.checked,
                                    },
                                  });
                                }
                              }}
                            />
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                    </EuiFormRow>
                  </EuiAccordion>
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
                defaultMessage="Migrate {agentCount, plural, one {# agent} other {# agents}}"
                values={{ agentCount: agents.length }}
              />
            </EuiButton>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
};