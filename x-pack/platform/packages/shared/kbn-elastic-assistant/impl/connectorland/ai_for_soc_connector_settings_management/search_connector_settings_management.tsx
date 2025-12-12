/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import { useAssistantContext } from '../../assistant_context';

import * as i18n from './translations';

const SearchConnectorSettingsManagementComponent: React.FC = () => {
  const { navigateToApp } = useAssistantContext();

  const onClick = useCallback(
    () =>
      navigateToApp('management', {
        path: 'data/content_connectors/connectors',
      }),
    [navigateToApp]
  );

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="l">
      <EuiTitle size="xs">
        <h2>{i18n.CONTENT_CONNECTORS_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem
          css={css`
            align-self: center;
          `}
        >
          <EuiText size="m">{i18n.CONTENT_CONNECTORS_DESCRIPTION}</EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton onClick={onClick}>{i18n.SETTINGS_MANAGE_CONNECTORS}</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const SearchConnectorSettingsManagement = React.memo(
  SearchConnectorSettingsManagementComponent
);
SearchConnectorSettingsManagementComponent.displayName =
  'SearchConnectorSettingsManagementComponent';
