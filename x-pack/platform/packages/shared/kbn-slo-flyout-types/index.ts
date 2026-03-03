/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType, FunctionComponent } from 'react';
import { createToken } from '@kbn/core-di';

/**
 * Props accepted by the SLO creation flyout.
 */
export interface CreateSLOFormFlyoutProps {
  onClose: () => void;
  initialValues?: Record<string, unknown>;
  formSettings?: {
    isEditMode?: boolean;
    allowedIndicatorTypes?: string[];
  };
}

/**
 * Props accepted by the SLO details flyout.
 */
export interface SLODetailsFlyoutProps {
  sloId: string;
  sloInstanceId?: string;
  onClose: () => void;
  size?: string;
  hideFooter?: boolean;
  session?: 'start' | 'inherit';
  initialTabId?: string;
}

/**
 * Injection token for the SLO creation flyout factory.
 *
 * Published globally by the SLO plugin via {@link Global}.
 * Consumers `@inject(SloCreateFlyoutToken)` without declaring `slo` in
 * `requiredPlugins` or `optionalPlugins`.
 */
export const SloCreateFlyoutToken =
  createToken<FunctionComponent<CreateSLOFormFlyoutProps>>('slo.CreateSLOFormFlyout');

/**
 * Injection token for the SLO details flyout component.
 *
 * Published globally by the SLO plugin via {@link Global}.
 */
export const SloDetailsFlyoutToken =
  createToken<ComponentType<SLODetailsFlyoutProps>>('slo.SLODetailsFlyout');
