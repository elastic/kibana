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
  } | null;
}

export const UpdateAvailableCallout = ({
  version,
  toggleChangelogModal,
  breakingChanges,
}: UpdateAvailableCalloutProps) => {
  const isOneChange =
    breakingChanges?.changelog.length === 1 && breakingChanges.changelog[0].changes.length === 1;

  const checkboxId = useGeneratedHtmlId({ prefix: 'understoodBreakingChangeCheckbox' });
  const { euiTheme } = useEuiTheme();

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

  return (
    <EuiCallOut
      color="warning"
      iconType="warning"
      title={breakingChanges ? titleWithBreakingChanges : defaultTitle}
    >
      {isOneChange ? (
        <>
          <FormattedMessage
            id="xpack.fleet.integration.settings.versionInfo.updatesAvailableWithSingleBreakingChangesBodyIntro"
            defaultMessage={
              'Version {version} includes new features and a breaking change that may affect your current setup:'
            }
            values={{
              version,
            }}
          />
          <EuiSpacer size="l" />
          <i
            css={css`
              font-weight: ${euiTheme.font.weight.medium};
            `}
          >{`"${breakingChanges.changelog?.[0]?.changes[0]?.description}"`}</i>
          <EuiSpacer size="l" />
          <FormattedMessage
            id="xpack.fleet.integration.settings.versionInfo.updatesAvailableWithSingleBreakingChangesBodyEnd"
            defaultMessage="Please review the changes carefully before upgrading."
          />
        </>
      ) : breakingChanges ? (
        <FormattedMessage
          id="xpack.fleet.integration.settings.versionInfo.updatesAvailableWithBreakingChangesBody"
          defaultMessage="Version {version} includes new features and breaking changes that may affect your current setup. Please review the changes carefully before upgrading."
          values={{
            version,
          }}
        />
      ) : (
        <FormattedMessage
          id="xpack.fleet.integration.settings.versionInfo.updatesAvailableBody"
          defaultMessage="Upgrade to version {version} to get the latest features."
          values={{
            version,
          }}
        />
      )}
      <EuiSpacer size="s" />
      <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
        {breakingChanges && (
          <EuiFlexItem grow={false}>
            <BreakingChangesButton
              href={isOneChange ? breakingChanges.changelog?.[0].changes[0].link : undefined}
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
      {breakingChanges && (
        <>
          <EuiSpacer size="m" />
          <EuiCheckbox
            id={checkboxId}
            data-test-subj="breakingChangeCheckbox"
            label="I've reviewed the breaking changes and understand the impact."
            onChange={breakingChanges.toggleIsUnderstood}
            checked={breakingChanges.isUnderstood}
          />
        </>
      )}
    </EuiCallOut>
  );
};

const BreakingChangesButton = ({ href, onClick }: { href?: string; onClick: () => void }) => {
  const { euiTheme } = useEuiTheme();

  const buttonCSS = css`
    background-color: ${euiTheme.colors.backgroundFilledWarning};
  `;

  if (href) {
    return (
      <EuiButton color="warning" css={buttonCSS} href={href} target="_blank">
        <FormattedMessage
          id="xpack.fleet.integrations.settings.versionInfo.reviewBreakingChangesButton"
          defaultMessage="Review breaking changes"
        />
        <EuiIcon type="popout" />
      </EuiButton>
    );
  }

  return (
    <EuiButton color="warning" css={buttonCSS} onClick={onClick}>
      <FormattedMessage
        id="xpack.fleet.integrations.settings.versionInfo.reviewBreakingChangesButton"
        defaultMessage="Review breaking changes"
      />
    </EuiButton>
  );
};
