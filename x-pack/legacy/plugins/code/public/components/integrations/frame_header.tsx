/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiButtonIcon, EuiFlexGroup, EuiLink, EuiText, EuiTextColor } from '@elastic/eui';

export const FrameHeader = ({
  fileName,
  lineNumber,
  onClick,
}: {
  fileName: string;
  lineNumber: number | string;
  onClick: () => void;
}) => (
  <EuiFlexGroup
    className="codeIntegrations__snippet-info"
    alignItems="center"
    justifyContent="spaceBetween"
    gutterSize="none"
  >
    <EuiText size="s">
      <EuiLink onClick={onClick}>{fileName}</EuiLink>
      <span> at </span>
      <EuiLink onClick={onClick}>line {lineNumber}</EuiLink>
    </EuiText>
    <EuiText size="xs">
      <EuiTextColor color="subdued">Last updated: 14 mins ago</EuiTextColor>
      <EuiButtonIcon
        className="codeIntegrations__link--external codeIntegrations__button-icon"
        iconType="codeApp"
        onClick={onClick}
      />
    </EuiText>
  </EuiFlexGroup>
);
