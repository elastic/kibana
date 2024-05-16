/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { HttpSetup } from '@kbn/core-http-browser';
import { ENTERPRISE } from '../../content/prompts/welcome/translations';
import { UpgradeButtons } from '../../upgrade/upgrade_buttons';

interface OwnProps {
  http: HttpSetup;
  isAssistantEnabled: boolean;
}

type Props = OwnProps;

/**
 * Provides a call-to-action for users to upgrade their subscription or set up a connector
 * depending on the isAssistantEnabled and isWelcomeSetup props.
 */
export const BlockBotCallToAction: React.FC<Props> = ({ http, isAssistantEnabled }) => {
  const basePath = http.basePath.get();
  return !isAssistantEnabled ? (
    <EuiFlexGroup
      justifyContent="center"
      direction="column"
      alignItems="center"
      gutterSize="l"
      css={css`
        width: 100%;
      `}
    >
      <EuiFlexItem
        grow={false}
        css={css`
          width: 400px;
        `}
      >
        <EuiText>
          <p>{ENTERPRISE}</p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{<UpgradeButtons basePath={basePath} />}</EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
};
