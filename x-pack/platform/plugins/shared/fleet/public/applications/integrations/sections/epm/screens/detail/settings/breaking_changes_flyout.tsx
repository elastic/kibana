/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiListGroup,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { type ChangelogEntry } from '../utils';

interface BreakingChangesFlyoutProps {
  breakingChanges: ChangelogEntry[];
  onClose: () => void;
}

const BreakingChangesList = ({ changelog }: { changelog: ChangelogEntry[] }) => {
  return changelog.map(({ version, changes }) => {
    const prLinks = changes.map(({ link }) => ({
      label: link,
      href: link,
      target: '_blank',
      css: css`
        padding-inline: 0px;
      `,
    }));

    return (
      <>
        <EuiTitle size="xxxs">
          <h3>Version {version}</h3>
        </EuiTitle>
        <EuiListGroup listItems={prLinks} color="primary" flush />
      </>
    );
  });
};

export const BreakingChangesFlyout = ({ onClose, breakingChanges }: BreakingChangesFlyoutProps) => {
  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>Review breaking changes</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>Please review the changes carefully before upgrading.</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <BreakingChangesList changelog={breakingChanges} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
