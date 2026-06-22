/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EisInferenceEndpointMetadata } from '@kbn/inference-common';
import { EisModelStatus } from '../../types';

import { ModelPreviewBadge } from './model_preview_badge';
import { ModelDeprecatedBadge } from './model_deprecated_badge';
import { ModelEOLBadge } from './model_eol_badge';

export interface ModelStatusBadgeProps {
  status: EisModelStatus;
  id: string;
  metadata: EisInferenceEndpointMetadata | undefined;
  iconOnly?: boolean;
}

export const ModelStatusBadge = ({ status, id, metadata, iconOnly }: ModelStatusBadgeProps) => {
  switch (status) {
    case EisModelStatus.Preview:
      return iconOnly ? null : <ModelPreviewBadge id={id} />;
    case EisModelStatus.Deprecated:
      return <ModelDeprecatedBadge id={id} metadata={metadata} iconOnly={iconOnly} />;
    case EisModelStatus.DeprecatedEOL:
      return <ModelEOLBadge id={id} metadata={metadata} iconOnly={iconOnly} />;
    default:
      return null;
  }
};
