/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type { RegisteredAttachmentViewProps } from '../../../client/attachment_framework/types';

type DashboardAttachmentRendererProps = RegisteredAttachmentViewProps;

export const DashboardAttachmentRenderer: React.FC<DashboardAttachmentRendererProps> = ({
  attachmentId,
}) => {
  return <EuiText size="s">{attachmentId}</EuiText>;
};

DashboardAttachmentRenderer.displayName = 'DashboardAttachmentRenderer';
