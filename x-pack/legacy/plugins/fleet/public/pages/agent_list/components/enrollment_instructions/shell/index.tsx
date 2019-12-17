/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
  EuiFieldText,
  EuiPopover,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ManualEnrollmentInstructions, ManualEnrollmentSteps } from '../';
import { EnrollmentApiKey } from '../../../../../../common/types/domain_data';
import * as MAC_COMMANDS from './mac_commands';

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
      commands: MAC_COMMANDS.INSTALL,
    },
    {
      title: i18n.translate('xpack.fleet.agentEnrollment.typeShell.manualInstall.stepTwoTitle', {
        defaultMessage: 'Edit the configuration',
      }),
      textPre: 'Modify the configuration file to set the connection information:',
      commands: MAC_COMMANDS.CONFIG,
      commandsLang: 'yaml',
    },
    {
      title: i18n.translate('xpack.fleet.agentEnrollment.typeShell.manualInstall.stepThreeTitle', {
        defaultMessage: 'Start the agent',
      }),
      commands: MAC_COMMANDS.START,
    },
  ],
};

interface Props {
  kibanaUrl: string;
  apiKey: EnrollmentApiKey;
}

export const ShellEnrollmentInstructions: React.FC<Props> = ({ kibanaUrl, apiKey }) => {
  // Platform state
  const [currentPlatform, setCurrentPlatform] = useState<keyof typeof PLATFORMS>('macos');
  const [isPlatformOptionsOpen, setIsPlatformOptionsOpen] = useState<boolean>(false);
  const [isManualInstallationOpen, setIsManualInstallationOpen] = useState<boolean>(false);

  // Build quick installation command
  const quickInstallInstructions = `API_KEY=${apiKey.api_key} sh -c "$(curl ${kibanaUrl}/api/fleet/install/${currentPlatform})"`;

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
