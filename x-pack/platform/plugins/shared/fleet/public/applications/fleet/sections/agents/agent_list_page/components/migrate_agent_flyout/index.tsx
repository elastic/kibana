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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { MigrateSingleAgentRequest } from '../../../../../../../../common/types';

import type { Agent } from '../../../../../types';

import { useMigrateSingleAgent, useStartServices } from '../../../../../hooks';

import { HeadersInput } from './headers_input';

interface Props {
  agents: Array<Agent | undefined>;
  onClose: () => void;
  onSave: () => void;
}

export const AgentMigrateFlyout: React.FC<Props> = ({ agents, onClose, onSave }) => {
  const { notifications } = useStartServices();
  const migrateAgent = useMigrateSingleAgent;
  const [formValid, setFormValid] = React.useState(false);
  const [validClusterURL, setValidClusterURL] = React.useState(false);
  const [formContent, setFormContent] = React.useState<MigrateSingleAgentRequest['body']>({
    id: agents[0]?.id!,
    uri: '',
    enrollment_token: '',
    settings: {},
  });

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
        // check that the uri matches a valid URI schema using zod
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
      migrateAgent(formContent);
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
      <EuiFlyout data-test-subj="migrateAgentFlyout" size="s" onClose={onClose}>
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
            <EuiFormRow>
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
                    <EuiFormRow label="ca_sha256">
                      <EuiFieldText
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
                    >
                      <EuiFieldText
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
                    >
                      <EuiFieldText
                        onChange={(e) =>
                          setFormContent({
                            ...formContent,
                            settings: { ...formContent.settings, proxy_url: e.target.value },
                          })
                        }
                        fullWidth
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
                    <EuiFormRow>
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
                    <EuiFormRow>
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
                        <EuiFlexItem>
                          <EuiSwitch
                            label={
                              <FormattedMessage
                                id="xpack.fleet.agentList.migrateAgentFlyout.replaceTokenLabel"
                                defaultMessage="Replace Token"
                              />
                            }
                            checked={formContent.settings?.replace_token ?? false}
                            onChange={(e) =>
                              setFormContent({
                                ...formContent,
                                settings: {
                                  ...formContent.settings,
                                  replace_token: e.target.checked,
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
