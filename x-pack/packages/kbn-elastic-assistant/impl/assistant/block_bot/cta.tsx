/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
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

export const BlockBotCallToAction: FunctionComponent<Props> = ({
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
      <EuiFlexItem>{connectorPrompt}</EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
};
