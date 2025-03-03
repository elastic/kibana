/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { GoogleCloudShellGuide } from './google_cloud_shell_guide';

interface Props {
  cloudShellUrl: string;
  cloudShellCommand: string;
  projectId?: string;
}

export const GoogleCloudShellInstructions: React.FunctionComponent<Props> = ({
  cloudShellUrl,
  cloudShellCommand,
  projectId,
}) => {
  return (
    <>
      <GoogleCloudShellGuide commandText={cloudShellCommand} hasProjectId={!!projectId} />
      <EuiSpacer size="m" />
      <EuiButton
        data-test-subj="launchGoogleCloudShellButtonAgentFlyoutTestId"
        color="primary"
        fill
        target="_blank"
        iconSide="left"
        iconType="launch"
        fullWidth
        href={cloudShellUrl}
      >
        <FormattedMessage
          id="xpack.fleet.agentEnrollment.googleCloudShell.launchButton"
          defaultMessage="Launch Google Cloud Shell"
        />
      </EuiButton>
    </>
  );
};
