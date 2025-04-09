/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiCallOut, EuiCheckbox, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { type ChangelogChange } from '../utils';

interface UpdateAvailableCalloutProps {
  version: string;
  toggleChangelogModal: () => void;
  breakingChanges: {
    changes: ChangelogChange[];
    isUnderstood: boolean;
    toggleIsUnderstood: () => void;
  };
}

export const UpdateAvailableCallout = ({
  version,
  toggleChangelogModal,
  breakingChanges,
}: UpdateAvailableCalloutProps) => {
  const hasBreakingChanges = breakingChanges.changes.length > 0;
  const checkboxId = useGeneratedHtmlId({ prefix: 'understoodBreakingChangeCheckbox' });
  const defaultTitle = 'New version available';
  const breakingChangesTitleClause = ': Action required due to breaking changes';

  const defaultBody = 'Upgrade to version {version} to get the latest features.';
  const breakingChangeBody =
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
        defaultMessage={hasBreakingChanges ? breakingChangeBody : defaultBody}
        values={{
          version,
        }}
      />
      <EuiSpacer size="s" />
      <EuiButton color="warning" onClick={toggleChangelogModal}>
        <FormattedMessage
          id="xpack.fleet.integration.settings.versionInfo.updatesAvailableChangelogLink"
          defaultMessage="View changelog"
        />
      </EuiButton>
      {hasBreakingChanges && (
        <>
          <EuiSpacer size="s" />
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
