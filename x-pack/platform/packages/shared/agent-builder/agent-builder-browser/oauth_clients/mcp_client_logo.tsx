/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IconSize } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import type { OAuthClientLogo } from '@kbn/agent-builder-common';
import { labels } from './translations';

export interface McpClientLogoProps {
  clientLogo?: OAuthClientLogo;
  size?: IconSize;
}

export const McpClientLogo = ({ clientLogo, size = 'm' }: McpClientLogoProps) => {
  if (!clientLogo) {
    return null;
  }

  const { media_type: mediaType, data } = clientLogo;
  const imageUrl = `data:${mediaType};base64,${data}`;
  return (
    <EuiIcon type={imageUrl} size={size} title={labels.logoTitle} data-test-subj="mcpClientLogo" />
  );
};
