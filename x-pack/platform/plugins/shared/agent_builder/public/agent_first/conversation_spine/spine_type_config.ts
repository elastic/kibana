/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed, IconType } from '@elastic/eui';
import { css, type SerializedStyles } from '@emotion/react';
import type { SpineType } from './types';

export interface SpineTypeVisualConfig {
  iconType: IconType;
  getBadgeStyles: (euiTheme: EuiThemeComputed<{}>) => SerializedStyles;
}

const mutedBadgeStyles = (
  euiTheme: EuiThemeComputed<{}>,
  background: string,
  text: string,
  border: string
) =>
  css`
    background-color: ${background};
    color: ${text};
    border: ${euiTheme.border.width.thin} solid ${border};
  `;

export const SPINE_TYPE_CONFIG: Record<SpineType, SpineTypeVisualConfig> = {
  chat: {
    iconType: 'comment',
    getBadgeStyles: (euiTheme) =>
      mutedBadgeStyles(
        euiTheme,
        euiTheme.colors.backgroundBaseSubdued,
        euiTheme.colors.textSubdued,
        euiTheme.colors.borderBaseSubdued
      ),
  },
  case: {
    iconType: 'documents',
    getBadgeStyles: (euiTheme) =>
      mutedBadgeStyles(
        euiTheme,
        euiTheme.colors.backgroundBaseWarning,
        euiTheme.colors.textWarning,
        euiTheme.colors.borderBaseWarning
      ),
  },
  incident: {
    iconType: 'alert',
    getBadgeStyles: (euiTheme) =>
      mutedBadgeStyles(
        euiTheme,
        euiTheme.colors.backgroundBaseSuccess,
        euiTheme.colors.textSuccess,
        euiTheme.colors.borderBaseSuccess
      ),
  },
};

export const getSpineTypeConfig = (type: SpineType): SpineTypeVisualConfig => SPINE_TYPE_CONFIG[type];
