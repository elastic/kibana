/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
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
  sendMigrateSingleAgent,
  sendBulkMigrateAgents,
  useStartServices,
} from '../../../../../hooks';

import { HeadersInput } from './headers_input';

interface Props {
  agents: Agent[] | string;
  agentCount: number;
  onClose: () => void;
  onSave: () => void;
  unsupportedMigrateAgents: Agent[];
}

export const AgentMigrateFlyout: React.FC<Props> = ({
  agents,
  agentCount,
  onClose,
  onSave,
  unsupportedMigrateAgents,
}) => {
  const { notifications } = useStartServices();
  const migrateAgent = sendMigrateSingleAgent;
  const migrateAgents = sendBulkMigrateAgents;
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

  const filteredAgents = useMemo(
    () =>
      Array.isArray(agents)
        ? agents.filter((agent) => !unsupportedMigrateAgents.some((a) => a.id === agent.id))
        : agents,
    [agents, unsupportedMigrateAgents]
  );
  const filteredAgentCount = useMemo(
    () => (Array.isArray(filteredAgents) ? filteredAgents.length : agentCount),
    [agentCount, filteredAgents]
  );

  useEffect(() => {
    const validateForm = () => {
      const hasValidAgents = !Array.isArray(filteredAgents) || filteredAgents.length > 0;
      if (formContent.uri && formContent.enrollment_token && validClusterURL && hasValidAgents) {
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
  }, [formContent, validClusterURL, filteredAgents]);

  const submitForm = async () => {
    try {
      if (Array.isArray(filteredAgents)) {
        if (filteredAgents.length === 1) {
          await migrateAgent({ ...formContent, id: filteredAgents[0].id });
        } else {
          await migrateAgents({
            ...formContent,
            agents: filteredAgents.map((agent) => agent.id),
          });
        }
      } else {
        // agents is a query string
        await migrateAgents({
          ...formContent,
          agents: filteredAgents,
        });
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
          defaultMessage: 'Failed to migrate {agentCount, plural, one {agent} other {agents}}',
          values: {
            agentCount: filteredAgentCount,
          },
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
      <EuiFlyout
        data-test-subj="migrateAgentFlyout"
        onClose={onClose}
        aria-labelledby={flyoutTitleId}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="l">
            <h1 id={flyoutTitleId}>
              <FormattedMessage
                id="xpack.fleet.agentList.migrateAgentFlyout.title"
                defaultMessage="Migrate {agentCount, plural, one {agent} other {agents}}"
                values={{
                  agentCount: filteredAgentCount,
                }}
              />
            </h1>
          </EuiTitle>
          <EuiSpacer />
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.agentList.migrateAgentFlyout.description"
              defaultMessage="Move {agentCount, plural, one {this agent} other {these agents}} to a different Fleet Server by specifying a new cluster URL and enrollment token."
              values={{
                agentCount: filteredAgentCount,
              }}
            />
          </EuiText>

          {Array.isArray(agents) && unsupportedMigrateAgents.length > 0 && (
            <>
              <EuiSpacer />
              <EuiPanel color="warning" data-test-subj="migrateAgentFlyoutAlertPanel">
                <EuiText color="warning" className="eui-alignMiddle">
                  <FormattedMessage
                    id="xpack.fleet.agentList.migrateAgentFlyout.warning"
                    defaultMessage="{icon} {x} of {y} selected agents cannot be migrated as they are either tamper-protected agents, Fleet Server agents, containerized agents, or agents on an unsupported version."
                    values={{
                      icon: <EuiIcon type="warning" />,
                      x: unsupportedMigrateAgents.length,
                      y: agentCount,
                    }}
                  />
                </EuiText>

                <EuiAccordion
                  id="migrateAgentFlyoutWarningAccordion"
                  buttonContent={
                    <EuiButtonEmpty onClick={() => {}} aria-label="View hosts">
                      <FormattedMessage
                        id="xpack.fleet.agentList.migrateAgentFlyout.warningAccordion"
                        defaultMessage="View hosts"
                      />
                    </EuiButtonEmpty>
                  }
                  initialIsOpen={false}
                >
                  <EuiSpacer size="s" />
                  <EuiText>
                    <ul>
                      {unsupportedMigrateAgents.map((agent) => (
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
                isInvalid={!validClusterURL && formContent.uri !== ''}
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
            <EuiFormRow fullWidth aria-label="Additional options">
              <EuiAccordion
                arrowDisplay="left"
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
                    {agents.length === 1 && (
                      <EuiFormRow
                        label={
                          <FormattedMessage
                            id="xpack.fleet.agentList.migrateAgentFlyout.replaceTokenLabel"
                            defaultMessage="Replace token"
                          />
                        }
                        fullWidth
                      >
                        <EuiFieldText
                          fullWidth
                          data-test-subj="migrateAgentFlyoutReplaceTokenInput"
                          onChange={(e) => {
                            if ('id' in formContent) {
                              setFormContent({
                                ...formContent,
                                settings: {
                                  ...formContent.settings,
                                  replace_token: e.target.value,
                                },
                              });
                            }
                          }}
                        />
                      </EuiFormRow>
                    )}

                    {agents.length === 1 && <EuiSpacer size="m" />}

                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.stagingLabel"
                          defaultMessage="Staging"
                        />
                      }
                      fullWidth
                    >
                      <EuiFieldText
                        fullWidth
                        onChange={(e) =>
                          setFormContent({
                            ...formContent,
                            settings: { ...formContent.settings, staging: e.target.value },
                          })
                        }
                      />
                    </EuiFormRow>
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
            <EuiButtonEmpty
              onClick={onClose}
              data-test-subj="migrateAgentFlyoutCancelButton"
              aria-label="Cancel"
            >
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
                values={{
                  agentCount: filteredAgentCount,
                }}
              />
            </EuiButton>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
};
