/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import {
  EuiButton,
  EuiCallOut,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { type BreakingChangesLog } from '../utils';

interface UpdateAvailableCalloutProps {
  version: string;
  toggleChangelogModal: () => void;
  breakingChanges: {
    changelog: BreakingChangesLog;
    isUnderstood: boolean;
    toggleIsUnderstood: () => void;
    onOpen: () => void;
  };
}

const BreakingChangesButton = ({
  changelog,
  onClick,
}: {
  changelog: BreakingChangesLog;
  onClick: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const isOneChange = changelog.length === 1 && changelog[0].changes.length === 1;

  const buttonText = 'Review breaking changes';
  const buttonCSS = css`
    background-color: ${euiTheme.colors.backgroundFilledWarning};
  `;

  if (isOneChange) {
    return (
      <EuiButton
        color="warning"
        css={buttonCSS}
        href={changelog[0].changes[0].link}
        target="_blank"
      >
        <FormattedMessage
          id="xpack.fleet.integrations.settings.versionInfo.reviewBreakingChangesButton"
          defaultMessage={buttonText}
        />
        <EuiIcon type="popout" />
      </EuiButton>
    );
  }

  return (
    <EuiButton color="warning" css={buttonCSS} onClick={onClick}>
      <FormattedMessage
        id="xpack.fleet.integrations.settings.versionInfo.reviewBreakingChangesButton"
        defaultMessage={buttonText}
      />
    </EuiButton>
  );
};

export const UpdateAvailableCallout = ({
  version,
  toggleChangelogModal,
  breakingChanges,
}: UpdateAvailableCalloutProps) => {
  const hasBreakingChanges = breakingChanges.changelog.length > 0;

  const checkboxId = useGeneratedHtmlId({ prefix: 'understoodBreakingChangeCheckbox' });

  const defaultTitle = (
    <FormattedMessage
      id="xpack.fleet.integrations.settings.versionInfo.updatesAvailable"
      defaultMessage="New version available"
    />
  );

  const titleWithBreakingChanges = (
    <FormattedMessage
      id="xpack.fleet.integrations.settings.versionInfo.updatesAvailableWithBreakingChanges"
      defaultMessage="New version available: Action required due to breaking changes"
    />
  );

  const defaultBody = 'Upgrade to version {version} to get the latest features.';
  const breakingChangesBody =
    'Version {version} includes new features and breaking changes that may affect your current setup. Please review the changes carefully before upgrading.';

  return (
    <EuiCallOut
      color="warning"
      iconType="warning"
      title={hasBreakingChanges ? titleWithBreakingChanges : defaultTitle}
    >
      {hasBreakingChanges ? (
        <FormattedMessage
          id="xpack.fleet.integration.settings.versionInfo.updatesAvailableWithBreakingChangesBody"
          defaultMessage={breakingChangesBody}
          values={{
            version,
          }}
        />
      ) : (
        <FormattedMessage
          id="xpack.fleet.integration.settings.versionInfo.updatesAvailableBody"
          defaultMessage={defaultBody}
          values={{
            version,
          }}
        />
      )}
      <EuiSpacer size="s" />
      <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
        {hasBreakingChanges && (
          <EuiFlexItem grow={false}>
            <BreakingChangesButton
              changelog={breakingChanges.changelog}
              onClick={breakingChanges.onOpen}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButton color="warning" onClick={toggleChangelogModal}>
            <FormattedMessage
              id="xpack.fleet.integration.settings.versionInfo.updatesAvailableChangelogLink"
              defaultMessage="View changelog"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {hasBreakingChanges && (
        <>
          <EuiSpacer size="m" />
          <EuiCheckbox
            id={checkboxId}
            label="I've reviewed the breaking changes and understand the impact."
            onChange={breakingChanges.toggleIsUnderstood}
            checked={breakingChanges.isUnderstood}
          />
        </>
      )}
    </EuiCallOut>
  );
};
