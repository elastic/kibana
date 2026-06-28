/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed, IconType } from '@elastic/eui';
import { css, type SerializedStyles } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SpineBadgeVariant, SpineType } from './types';

export interface SpineTypeTabDefinition {
  id: string;
  name: string;
}

interface SpineTypeColorFamily {
  ghostBackground: string;
  ghostText: string;
  ghostBorder: string;
  solidBackground: string;
  solidText: string;
  solidHoverBackground: string;
}

export interface SpineTypeConfig {
  iconType: IconType;
  label: string;
  getGhostBadgeStyles: (euiTheme: EuiThemeComputed<{}>) => SerializedStyles;
  getSolidBadgeStyles: (euiTheme: EuiThemeComputed<{}>) => SerializedStyles;
  getInteractiveBadgeStyles: (euiTheme: EuiThemeComputed<{}>) => SerializedStyles;
  typeSpecificTabs: SpineTypeTabDefinition[];
}

const labels = {
  attachments: i18n.translate('xpack.agentBuilder.conversationSpine.tabs.attachments', {
    defaultMessage: 'Attachments',
  }),
  people: i18n.translate('xpack.agentBuilder.conversationSpine.tabs.people', {
    defaultMessage: 'People',
  }),
  chat: i18n.translate('xpack.agentBuilder.conversationSpine.type.chat', {
    defaultMessage: 'Chat',
  }),
  case: i18n.translate('xpack.agentBuilder.conversationSpine.type.case', {
    defaultMessage: 'Case',
  }),
  incident: i18n.translate('xpack.agentBuilder.conversationSpine.type.incident', {
    defaultMessage: 'Incident',
  }),
  threatHunt: i18n.translate('xpack.agentBuilder.conversationSpine.type.threatHunt', {
    defaultMessage: 'Threat Hunt',
  }),
  overview: i18n.translate('xpack.agentBuilder.conversationSpine.tabs.overview', {
    defaultMessage: 'Overview',
  }),
  evidence: i18n.translate('xpack.agentBuilder.conversationSpine.tabs.evidence', {
    defaultMessage: 'Evidence',
  }),
  timeline: i18n.translate('xpack.agentBuilder.conversationSpine.tabs.timeline', {
    defaultMessage: 'Timeline',
  }),
  actions: i18n.translate('xpack.agentBuilder.conversationSpine.tabs.actions', {
    defaultMessage: 'Actions',
  }),
};

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

const interactiveSolidBadgeStyles = (
  euiTheme: EuiThemeComputed<{}>,
  background: string,
  text: string,
  hoverBackground: string
) => css`
  ${solidBadgeStyles(euiTheme, background, text)}
  cursor: pointer;
  transition: background-color 120ms ease-in-out, border-color 120ms ease-in-out;

  .euiIcon {
    color: inherit;
  }

  &:hover:not(:disabled) {
    background-color: ${hoverBackground};
    border-color: ${hoverBackground};
  }
`;

const solidBadgeStyles = (
  euiTheme: EuiThemeComputed<{}>,
  background: string,
  text: string
) =>
  css`
    background-color: ${background};
    color: ${text};
    border: ${euiTheme.border.width.thin} solid ${background};

    .euiBadge__icon {
      color: ${text};
    }
  `;

const createSpineTypeConfig = (
  iconType: IconType,
  label: string,
  getColors: (euiTheme: EuiThemeComputed<{}>) => SpineTypeColorFamily,
  typeSpecificTabs: SpineTypeTabDefinition[]
): SpineTypeConfig => ({
  iconType,
  label,
  getGhostBadgeStyles: (euiTheme) => {
    const colors = getColors(euiTheme);
    return mutedBadgeStyles(
      euiTheme,
      colors.ghostBackground,
      colors.ghostText,
      colors.ghostBorder
    );
  },
  getSolidBadgeStyles: (euiTheme) => {
    const colors = getColors(euiTheme);
    return solidBadgeStyles(euiTheme, colors.solidBackground, colors.solidText);
  },
  getInteractiveBadgeStyles: (euiTheme) => {
    const colors = getColors(euiTheme);
    return interactiveSolidBadgeStyles(
      euiTheme,
      colors.solidBackground,
      colors.solidText,
      colors.solidHoverBackground
    );
  },
  typeSpecificTabs,
});

export const SPINE_TYPE_ORDER: SpineType[] = ['chat', 'case', 'incident', 'threat_hunt'];

export const PROMOTABLE_SPINE_TYPES: SpineType[] = ['case', 'incident', 'threat_hunt'];

export const SPINE_TYPE_CONFIG: Record<SpineType, SpineTypeConfig> = {
  chat: createSpineTypeConfig('comment', labels.chat, (euiTheme) => ({
    ghostBackground: euiTheme.colors.backgroundBaseSubdued,
    ghostText: euiTheme.colors.textSubdued,
    ghostBorder: euiTheme.colors.borderBaseSubdued,
    solidBackground: euiTheme.colors.backgroundFilledText,
    solidText: euiTheme.colors.textInverse,
    solidHoverBackground: euiTheme.colors.backgroundFilledText,
  }), []),
  case: createSpineTypeConfig('documents', labels.case, (euiTheme) => ({
    ghostBackground: euiTheme.colors.backgroundBaseWarning,
    ghostText: euiTheme.colors.textWarning,
    ghostBorder: euiTheme.colors.borderBaseWarning,
    solidBackground: euiTheme.colors.backgroundFilledWarning,
    solidText: euiTheme.colors.textInverse,
    solidHoverBackground: euiTheme.colors.backgroundFilledWarning,
  }), [
    { id: 'overview', name: labels.overview },
    { id: 'evidence', name: labels.evidence },
    { id: 'timeline', name: labels.timeline },
    { id: 'actions', name: labels.actions },
  ]),
  incident: createSpineTypeConfig('alert', labels.incident, (euiTheme) => ({
    ghostBackground: euiTheme.colors.backgroundBaseSuccess,
    ghostText: euiTheme.colors.textSuccess,
    ghostBorder: euiTheme.colors.borderBaseSuccess,
    solidBackground: euiTheme.colors.backgroundFilledSuccess,
    solidText: euiTheme.colors.textInverse,
    solidHoverBackground: euiTheme.colors.backgroundFilledSuccess,
  }), [
    { id: 'overview', name: labels.overview },
    { id: 'timeline', name: labels.timeline },
    { id: 'actions', name: labels.actions },
  ]),
  threat_hunt: createSpineTypeConfig('search', labels.threatHunt, (euiTheme) => ({
    ghostBackground: euiTheme.colors.backgroundLightPrimary,
    ghostText: euiTheme.colors.textPrimary,
    ghostBorder: euiTheme.colors.borderBasePrimary,
    solidBackground: euiTheme.colors.backgroundFilledPrimary,
    solidText: euiTheme.colors.textInverse,
    solidHoverBackground: euiTheme.colors.backgroundFilledPrimary,
  }), [
    { id: 'overview', name: labels.overview },
    { id: 'evidence', name: labels.evidence },
    { id: 'actions', name: labels.actions },
  ]),
};

export const getSpineTypeConfig = (type: SpineType): SpineTypeConfig => SPINE_TYPE_CONFIG[type];

export const getBadgeStylesForVariant = (
  type: SpineType,
  variant: SpineBadgeVariant,
  euiTheme: EuiThemeComputed<{}>
): SerializedStyles => {
  const config = getSpineTypeConfig(type);
  return variant === 'solid'
    ? config.getSolidBadgeStyles(euiTheme)
    : config.getGhostBadgeStyles(euiTheme);
};

export const getSpineTypeLabel = (type: SpineType): string => getSpineTypeConfig(type).label;

export const BASE_SPINE_TABS: SpineTypeTabDefinition[] = [
  { id: 'attachments', name: labels.attachments },
  { id: 'people', name: labels.people },
];

export const getAllTabsForSpineType = (type: SpineType): SpineTypeTabDefinition[] => [
  ...getSpineTypeConfig(type).typeSpecificTabs,
  ...BASE_SPINE_TABS,
];

export const getDefaultTabForSpineType = (type: SpineType): string => {
  const tabs = getAllTabsForSpineType(type);
  return tabs[0]?.id ?? 'attachments';
};

export const isValidTabForSpineType = (type: SpineType, tabId: string): boolean =>
  getAllTabsForSpineType(type).some((tab) => tab.id === tabId);
