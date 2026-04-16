/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { labels } from '../../../utils/i18n';
import nightshiftIllustration from './assets/nightshift_illustration.svg';

const { agentOverview: overviewLabels } = labels;

const ILLUSTRATION_HEIGHT = '112px';

export interface NightshiftCustomizationCardProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  /** When set, card matches Customization column height (fixed row). */
  heightPx?: number;
}

export const NightshiftCustomizationCard: React.FC<NightshiftCustomizationCardProps> = ({
  enabled,
  onEnabledChange,
  heightPx,
}) => {
  const { euiTheme } = useEuiTheme();

  const panelHeightCss =
    heightPx !== undefined
      ? css`
          height: ${heightPx}px;
          max-height: ${heightPx}px;
          overflow-y: auto;
          min-height: 0;
        `
      : undefined;

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      data-test-subj="agentOverviewNightshiftCard"
      css={panelHeightCss}
    >
      <div
        css={css`
          width: 100%;
          height: ${ILLUSTRATION_HEIGHT};
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
          display: flex;
          align-items: center;
          justify-content: center;
        `}
      >
        <img src={nightshiftIllustration} alt="" width={96} height={96} />
      </div>
      <div
        css={css`
          padding: ${euiTheme.size.base};
        `}
      >
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>{overviewLabels.nightshiftTitle}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={overviewLabels.nightshiftSwitchAriaLabel}
              checked={enabled}
              compressed
              showLabel={false}
              onChange={(e) => onEnabledChange(e.target.checked)}
              data-test-subj="agentOverviewNightshiftSwitch"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>{overviewLabels.nightshiftDescription}</p>
        </EuiText>
      </div>
    </EuiPanel>
  );
};
