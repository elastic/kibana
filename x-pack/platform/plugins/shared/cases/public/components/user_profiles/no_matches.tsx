/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
} from '@elastic/eui';
import React from 'react';
import * as i18n from './translations';

const NoMatchesComponent: React.FC = () => {
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      direction="column"
      justifyContent="spaceAround"
      data-test-subj="case-user-profiles-assignees-popover-no-matches"
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type="userAvatar" size="xl" />
        <EuiSpacer size="xs" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTextAlign textAlign="center">
          <EuiText size="s" color="default">
            <strong>{i18n.USER_DOES_NOT_EXIST}</strong>
            <br />
          </EuiText>
          <EuiText size="s" color="subdued">
            {i18n.MODIFY_SEARCH}
            <br />
            <EuiLink
              href="https://www.elastic.co/guide/en/security/current/case-permissions.html"
              target="_blank"
            >
              {i18n.LEARN_PRIVILEGES_GRANT_ACCESS}
            </EuiLink>
          </EuiText>
        </EuiTextAlign>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
NoMatchesComponent.displayName = 'NoMatches';

export const NoMatches = React.memo(NoMatchesComponent);
