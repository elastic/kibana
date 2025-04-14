/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiDescriptionList,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { type BreakingChangesLog } from '../utils';

interface BreakingChangesFlyoutProps {
  breakingChanges: BreakingChangesLog;
  onClose: () => void;
}

const BreakingChangesList = ({ changelog }: { changelog: BreakingChangesLog }) => {
  return changelog.map(({ version, changes }) => {
    const changeItems = changes.map(({ link, description }) => ({
      description,
      title: (
        <EuiLink href={link} target="_blank" color="primary" data-test-subj="breakingChangeLink">
          {link}
        </EuiLink>
      ),
    }));

    return (
      <>
        <EuiTitle size="xxxs">
          <h3>
            <FormattedMessage
              id="xpack.fleet.integrations.settings.breakingChangesFlyout.changeVersionHeader"
              defaultMessage="Version {version}"
              values={{ version }}
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiDescriptionList listItems={changeItems} />
        <EuiSpacer size="m" />
      </>
    );
  });
};

export const BreakingChangesFlyout = ({ onClose, breakingChanges }: BreakingChangesFlyoutProps) => {
  return (
    <EuiFlyout onClose={onClose} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.fleet.integrations.settings.breakingChangesFlyout.headerTitle"
              defaultMessage="Review breaking changes"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.fleet.integrations.settings.breakingChangesFlyout.headerDescription"
              defaultMessage="Please review the changes carefully before upgrading."
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <BreakingChangesList changelog={breakingChanges} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
