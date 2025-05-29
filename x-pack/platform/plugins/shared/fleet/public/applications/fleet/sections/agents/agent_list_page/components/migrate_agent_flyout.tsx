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
    settings: {
      ca_sha256: '',
      certificate_authorities: '',
      elastic_agent_cert: '',
      elastic_agent_cert_key: '',
      elastic_agent_cert_key_passphrase: '',
      headers: {},
      insecure: false,
      proxy_disabled: false,
      proxy_headers: {},
      proxy_url: '',
      staging: false,
      tags: [],
      replace_token: false,
    },
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
            <EuiSpacer size="m" />

            {/* Additional Settings Section */}
            <EuiFormRow>
              <EuiAccordion
                arrowDisplay="right"
                id="migrateAgentFlyoutAdditionalOptions"
                initialIsOpen={true}
                buttonContent={
                  <EuiTextColor color="primary">
                    <FormattedMessage
                      id="xpack.fleet.agentList.migrateAgentFlyout.additionalOptionsLabel"
                      defaultMessage="Additional options"
                    />
                  </EuiTextColor>
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
                    <EuiFormRow label="ca_sha256">
                      <EuiFieldText />
                    </EuiFormRow>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.certAuthLabel"
                          defaultMessage="Certificate Authorities"
                        />
                      }
                    >
                      <EuiFieldText />
                    </EuiFormRow>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.elasticAgentCertLabel"
                          defaultMessage="Elastic Agent Certificate"
                        />
                      }
                    >
                      <EuiTextArea />
                    </EuiFormRow>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.elasticAgentCertKeyLabel"
                          defaultMessage="Elastic Agent Certificate Key"
                        />
                      }
                    >
                      <EuiTextArea />
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
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.headersLabel"
                          defaultMessage="Headers"
                        />
                      }
                    >
                      <EuiTextArea />
                    </EuiFormRow>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.proxyHeadersLabel"
                          defaultMessage="Proxy Headers"
                        />
                      }
                    >
                      <EuiTextArea />
                    </EuiFormRow>
                  </EuiAccordion>
                  <EuiSpacer size="m" />
                  {/* Networking section */}
                  <EuiAccordion
                    id="headersSection"
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
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.fleet.agentList.migrateAgentFlyout.headersLabel"
                          defaultMessage="Proxy URL"
                        />
                      }
                    >
                      <EuiFieldText />
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
                            checked={formContent.settings.insecure}
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
                            checked={formContent.settings.staging}
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
                            checked={formContent.settings.insecure}
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
                                id="xpack.fleet.agentList.migrateAgentFlyout.replaceTokenLabel"
                                defaultMessage="Replace Token"
                              />
                            }
                            checked={formContent.settings.replace_token}
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
