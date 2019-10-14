/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, Fragment } from 'react';
import {
  EuiFieldText,
  EuiCopy,
  EuiButtonEmpty,
  EuiPopover,
  EuiSpacer,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { ManualEnrollmentInstructions, ManualEnrollmentSteps } from './';

// No need for i18n as these are platform names
const PLATFORMS = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

// Manual instructions based on platform
const PLATFORM_INSTRUCTIONS: {
  [key: string]: ManualEnrollmentInstructions;
} = {
  macos: [
    {
      title: i18n.translate('xpack.fleet.agentEnrollment.typeShell.manualInstall.stepOneTitle', {
        defaultMessage: 'Download and install Elastic Agent',
      }),
      textPre: 'Lorem ipsum instructions here.',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/some-file-to-download.tar.gz',
        'tar xzvf some-file-to-download.tar.gz',
        'cd some-file-to-download/',
      ],
    },
    {
      title: i18n.translate('xpack.fleet.agentEnrollment.typeShell.manualInstall.stepTwoTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: 'Modify the configuration file to set the connection information:',
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"',
      ],
    },
    {
      title: i18n.translate('xpack.fleet.agentEnrollment.typeShell.manualInstall.stepThreeTitle', {
        defaultMessage: 'Start the agent',
      }),
      commands: ['./somefile setup', './somefile -e'],
    },
  ],
};

interface Props {
  kibanaUrl: string;
}

export const ShellEnrollmentInstructions: React.SFC<Props> = ({ kibanaUrl }) => {
  // Platform state
  const [currentPlatform, setCurrentPlatform] = useState<keyof typeof PLATFORMS>('macos');
  const [isPlatformOptionsOpen, setIsPlatformOptionsOpen] = useState<boolean>(false);
  const [isManualInstallationOpen, setIsManualInstallationOpen] = useState<boolean>(false);

  // Build quick installation command
  const quickInstallInstructions = `curl ${kibanaUrl}/api/fleet/install/${currentPlatform} | bash`;

  return (
    <Fragment>
      <EuiFieldText
        readOnly
        value={quickInstallInstructions}
        fullWidth
        prepend={
          <EuiPopover
            button={
              <EuiButtonEmpty
                size="xs"
                iconType="arrowDown"
                iconSide="right"
                onClick={() => setIsPlatformOptionsOpen(true)}
              >
                {PLATFORMS[currentPlatform]}
              </EuiButtonEmpty>
            }
            isOpen={isPlatformOptionsOpen}
            closePopover={() => setIsPlatformOptionsOpen(false)}
          >
            <EuiContextMenuPanel
              items={Object.entries(PLATFORMS).map(([platform, name]) => (
                <EuiContextMenuItem
                  key={platform}
                  onClick={() => {
                    setCurrentPlatform(platform as typeof currentPlatform);
                    setIsPlatformOptionsOpen(false);
                  }}
                >
                  {name}
                </EuiContextMenuItem>
              ))}
            />
          </EuiPopover>
        }
        append={
          <EuiCopy textToCopy={quickInstallInstructions}>
            {copy => (
              <EuiButtonEmpty onClick={copy} color="primary" size="s">
                <FormattedMessage
                  id="xpack.fleet.agentEnrollment.copyInstructionsButtonText"
                  defaultMessage="copy"
                />
              </EuiButtonEmpty>
            )}
          </EuiCopy>
        }
      />

      <EuiSpacer size="m" />

      <EuiButtonEmpty
        onClick={() => setIsManualInstallationOpen(!isManualInstallationOpen)}
        iconType={isManualInstallationOpen ? 'arrowUp' : 'arrowDown'}
        iconSide="right"
        size="xs"
        flush="left"
      >
        <FormattedMessage
          id="xpack.fleet.agentEnrollment.manualInstructionsToggleLinkText"
          defaultMessage="Manual installation"
        />
      </EuiButtonEmpty>

      {isManualInstallationOpen ? (
        <Fragment>
          <EuiSpacer size="m" />
          <ManualEnrollmentSteps
            instructions={PLATFORM_INSTRUCTIONS[currentPlatform] || PLATFORM_INSTRUCTIONS.macos}
          />
        </Fragment>
      ) : null}
    </Fragment>
  );
};
