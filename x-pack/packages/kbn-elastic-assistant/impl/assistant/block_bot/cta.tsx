/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { HttpSetup } from '@kbn/core-http-browser';
import { UpgradeButtons } from '../../upgrade/upgrade_buttons';

interface OwnProps {
  connectorPrompt: React.ReactElement;
  http: HttpSetup;
  isAssistantEnabled: boolean;
  isWelcomeSetup: boolean;
}

type Props = OwnProps;

/**
 * Provides a call-to-action for users to upgrade their subscription or set up a connector
 * depending on the isAssistantEnabled and isWelcomeSetup props.
 */
export const BlockBotCallToAction: React.FC<Props> = ({
  connectorPrompt,
  http,
  isAssistantEnabled,
  isWelcomeSetup,
}) => {
  const basePath = http.basePath.get();
  return !isAssistantEnabled ? (
    <EuiFlexGroup
      justifyContent="spaceAround"
      css={css`
        width: 100%;
      `}
    >
      <EuiFlexItem grow={false}>{<UpgradeButtons basePath={basePath} />}</EuiFlexItem>
    </EuiFlexGroup>
  ) : isWelcomeSetup ? (
    <EuiFlexGroup
      css={css`
        width: 100%;
      `}
    >
      <EuiFlexItem data-test-subj="connector-prompt">{connectorPrompt}</EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
};
