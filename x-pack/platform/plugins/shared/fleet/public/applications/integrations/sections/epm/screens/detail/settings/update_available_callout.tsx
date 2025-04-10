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
  EuiSpacer,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { type ChangelogEntry } from '../utils';

interface UpdateAvailableCalloutProps {
  version: string;
  toggleChangelogModal: () => void;
  breakingChanges: {
    changes: ChangelogEntry[];
    isUnderstood: boolean;
    toggleIsUnderstood: () => void;
    onOpen: () => void;
  };
}

export const UpdateAvailableCallout = ({
  version,
  toggleChangelogModal,
  breakingChanges,
}: UpdateAvailableCalloutProps) => {
  const { euiTheme } = useEuiTheme();
  const hasBreakingChanges = breakingChanges.changes.length > 0;
  const checkboxId = useGeneratedHtmlId({ prefix: 'understoodBreakingChangeCheckbox' });
  const defaultTitle = 'New version available';
  const breakingChangesTitleClause = ': Action required due to breaking changes';

  const defaultBody = 'Upgrade to version {version} to get the latest features.';
  const breakingChangesBody =
    'Version {version} includes new features and breaking changes that may affect your current setup. Please review the changes carefully before upgrading.';

  return (
    <EuiCallOut
      color="warning"
      iconType="warning"
      title={i18n.translate('xpack.fleet.integrations.settings.versionInfo.updatesAvailable', {
        defaultMessage: `${defaultTitle}${hasBreakingChanges ? breakingChangesTitleClause : ''}`,
      })}
    >
      <FormattedMessage
        id="xpack.fleet.integration.settings.versionInfo.updatesAvailableBody"
        defaultMessage={hasBreakingChanges ? breakingChangesBody : defaultBody}
        values={{
          version,
        }}
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
        {hasBreakingChanges && (
          <EuiFlexItem grow={false}>
            <EuiButton
              color="warning"
              css={css`
                background-color: ${euiTheme.colors.backgroundFilledWarning};
              `}
              onClick={breakingChanges.onOpen}
            >
              <FormattedMessage
                id="xpack.fleet.integrations.settings.versionInfo.reviewBreakingChangesButton"
                defaultMessage="Review breaking changes"
              />
            </EuiButton>
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
            label="I've reviewed the breaking changes and understand the impact"
            onChange={breakingChanges.toggleIsUnderstood}
            checked={breakingChanges.isUnderstood}
          />
        </>
      )}
    </EuiCallOut>
  );
};
