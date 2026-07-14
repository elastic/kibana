/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType, FunctionComponent } from 'react';
import type { EuiFlyoutProps } from '@elastic/eui';
import type { SloTabId } from '@kbn/deeplinks-observability';
import type { CreateSLOInput, IndicatorType } from '@kbn/slo-schema';
import type { RecursivePartial } from '@kbn/utility-types';
import { createTokenFactory } from '@kbn/plugin-di';

const sloTokens = createTokenFactory('slo');

/**
 * Props accepted by the SLO creation flyout.
 *
 * Mirrors the SLO plugin's flyout component so the provided value satisfies the
 * service token without casts; consumers pass partial SLO input as seed values.
 */
export interface CreateSLOFormFlyoutProps {
  onClose: () => void;
  initialValues?: RecursivePartial<CreateSLOInput>;
  formSettings?: {
    isEditMode?: boolean;
    allowedIndicatorTypes?: IndicatorType[];
  };
}

/**
 * Props accepted by the SLO details flyout.
 */
export interface SLODetailsFlyoutProps {
  sloId: string;
  sloInstanceId?: string;
  onClose: () => void;
  size?: EuiFlyoutProps['size'];
  hideFooter?: boolean;
  session?: 'start' | 'inherit';
  initialTabId?: SloTabId;
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
