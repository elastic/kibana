/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/css';

import { type BreakingChangesLog } from '../utils';

interface BreakingChangesFlyoutProps {
  breakingChanges: BreakingChangesLog;
  onClose: () => void;
}

const BreakingChangeListItems = ({ changes }: { changes: BreakingChangesLog[0]['changes'] }) => {
  return changes.map(({ link, description }) => {
    return (
      <li key={link}>
        <EuiText color="subdued">{description}</EuiText>
        <EuiSpacer size="xs" />
        <EuiLink href={link} target="_blank" color="primary" data-test-subj="breakingChangeLink">
          <EuiText component="span">
            <FormattedMessage
              id="xpack.fleet.integrations.settings.breakingChangesFlyout.prLinkText"
              defaultMessage="Review changes"
            />
          </EuiText>
        </EuiLink>
      </li>
    );
  });
};

const BreakingChangesList = ({ changelog }: { changelog: BreakingChangesLog }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <ul
      className={css`
        li:nth-child(even) {
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
        }
      `}
    >
      {changelog.map(({ version, changes }) => {
        return (
          <li
            key={version}
            className={css`
              padding: ${euiTheme.size.l};
            `}
          >
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.fleet.integrations.settings.breakingChangesFlyout.changeVersionHeader"
                  defaultMessage="Version {version}"
                  values={{ version }}
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <ul>
              <BreakingChangeListItems changes={changes} />
            </ul>
          </li>
        );
      })}
    </ul>
  );
};

export const BreakingChangesFlyout = ({ onClose, breakingChanges }: BreakingChangesFlyoutProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlyout onClose={onClose} size="m" paddingSize="none">
      <EuiFlyoutHeader hasBorder>
        <div
          className={css`
            padding: ${euiTheme.size.l};
          `}
        >
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
        </div>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <BreakingChangesList changelog={breakingChanges} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
