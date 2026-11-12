/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  CLI_COMMAND_REFERENCE_URL,
  CLI_INSTALL_COMMAND,
  CLI_REPO_URL,
  CLI_VERIFY_COMMAND,
  buildCliConnectCommand,
} from './constants';

export interface CliInstallModalProps {
  /** Shown in the connect command. Pass `null` while unknown to show a placeholder. */
  elasticsearchUrl: string | null;
  onClose: () => void;
  /** Prefix for the `data-telemetry-id` of the footer links and Close button, so each host keeps its own namespace. */
  telemetryIdPrefix: string;
}

interface CliStepProps {
  title: string;
  description?: string;
  command: string;
  dataTestSubj: string;
}

const CliStep = ({ title, description, command, dataTestSubj }: CliStepProps) => (
  <>
    <EuiTitle size="xs">
      <h4>{title}</h4>
    </EuiTitle>
    {description && (
      <>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>{description}</p>
        </EuiText>
      </>
    )}
    <EuiSpacer size="s" />
    <EuiPanel color="subdued" paddingSize="none">
      <EuiCodeBlock
        transparentBackground
        language="bash"
        isCopyable
        paddingSize="m"
        fontSize="m"
        data-test-subj={dataTestSubj}
      >
        {command}
      </EuiCodeBlock>
    </EuiPanel>
  </>
);

export const CliInstallModal = ({
  elasticsearchUrl,
  onClose,
  telemetryIdPrefix,
}: CliInstallModalProps) => {
  const { euiTheme } = useEuiTheme();
  const modalTitleId = useGeneratedHtmlId({ prefix: 'cliInstallModal' });
  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={modalTitleId}
      maxWidth={euiTheme.base * 40}
      data-test-subj="cliInstallModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.sharedComponents.cliInstallModal.title', {
                defaultMessage: 'Install Elastic CLI',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label={i18n.translate(
                  'xpack.sharedComponents.cliInstallModal.technicalPreviewBadgeLabel',
                  { defaultMessage: 'Technical preview' }
                )}
                tooltipContent={i18n.translate(
                  'xpack.sharedComponents.cliInstallModal.technicalPreviewBadgeDescription',
                  {
                    defaultMessage:
                      'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
                  }
                )}
                size="m"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.sharedComponents.cliInstallModal.description', {
              defaultMessage:
                'Run these commands in your terminal to install the CLI and connect to this project.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="l" />
        <CliStep
          title={i18n.translate('xpack.sharedComponents.cliInstallModal.installStepTitle', {
            defaultMessage: 'Install the CLI',
          })}
          command={CLI_INSTALL_COMMAND}
          dataTestSubj="cliInstallModalInstallCode"
        />
        <EuiSpacer size="l" />
        <CliStep
          title={i18n.translate('xpack.sharedComponents.cliInstallModal.connectStepTitle', {
            defaultMessage: 'Connect your serverless project',
          })}
          description={i18n.translate(
            'xpack.sharedComponents.cliInstallModal.connectStepDescription',
            {
              defaultMessage:
                'Use your project endpoint and an API key to securely add your project to the CLI. Currently only serverless projects are supported.',
            }
          )}
          command={buildCliConnectCommand(elasticsearchUrl)}
          dataTestSubj="cliInstallModalConnectCode"
        />
        <EuiSpacer size="l" />
        <CliStep
          title={i18n.translate('xpack.sharedComponents.cliInstallModal.verifyStepTitle', {
            defaultMessage: 'Verify the connection',
          })}
          command={CLI_VERIFY_COMMAND}
          dataTestSubj="cliInstallModalVerifyCode"
        />
        <EuiSpacer size="l" />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexItem grow>
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="text"
                flush="left"
                href={CLI_REPO_URL}
                target="_blank"
                iconType="logoGithub"
                data-test-subj="cliInstallModalRepoLink"
                data-telemetry-id={`${telemetryIdPrefix}-repoLink`}
              >
                {i18n.translate('xpack.sharedComponents.cliInstallModal.repoLink', {
                  defaultMessage: 'elastic/cli',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="text"
                flush="left"
                href={CLI_COMMAND_REFERENCE_URL}
                target="_blank"
                iconType="documentation"
                data-test-subj="cliInstallModalCommandReferenceLink"
                data-telemetry-id={`${telemetryIdPrefix}-commandReference`}
              >
                {i18n.translate('xpack.sharedComponents.cliInstallModal.commandReferenceLink', {
                  defaultMessage: 'Command reference',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiButton
          onClick={onClose}
          data-test-subj="cliInstallModalCloseBtn"
          data-telemetry-id={`${telemetryIdPrefix}-close`}
        >
          {i18n.translate('xpack.sharedComponents.cliInstallModal.close', {
            defaultMessage: 'Close',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
