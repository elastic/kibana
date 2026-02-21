/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType, FunctionComponent } from 'react';
import { createTokenFactory } from '@kbn/plugin-di';

const sloTokens = createTokenFactory('slo');

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
 * Service token for the SLO creation flyout factory.
 *
 * Provided by the SLO plugin as a cross-plugin service.
 * Consumers `@injectService(SloCreateFlyoutToken)` without declaring `slo` in
 * `requiredPlugins` or `optionalPlugins`.
 */
export const SloCreateFlyoutToken =
  sloTokens.service<FunctionComponent<CreateSLOFormFlyoutProps>>('CreateSLOFormFlyout');

/**
 * Service token for the SLO details flyout component.
 *
 * Provided by the SLO plugin as a cross-plugin service.
 */
export const SloDetailsFlyoutToken =
  sloTokens.service<ComponentType<SLODetailsFlyoutProps>>('SLODetailsFlyout');
