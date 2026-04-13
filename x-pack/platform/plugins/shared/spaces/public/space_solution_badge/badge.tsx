/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiBadgeProps } from '@elastic/eui';
import { EuiBadge, EuiIcon, euiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import type { Space } from '../../common';

const SolutionOptions: Record<
  NonNullable<Space['solution']>,
  { iconType: string; label: JSX.Element }
> = {
  es: {
    iconType: 'logoElasticsearch',
    label: (
      <FormattedMessage
        id="xpack.spaces.spaceSolutionBadge.elasticsearch"
        defaultMessage="Elasticsearch"
      />
    ),
  },
  workplaceai: {
    iconType: 'logoElasticsearch',
    label: (
      <FormattedMessage
        id="xpack.spaces.spaceSolutionBadge.workplaceai"
        defaultMessage="Workplace AI"
      />
    ),
  },
  security: {
    iconType: 'logoSecurity',
    label: (
      <FormattedMessage id="xpack.spaces.spaceSolutionBadge.security" defaultMessage="Security" />
    ),
  },
  oblt: {
    iconType: 'logoObservability',
    label: (
      <FormattedMessage
        id="xpack.spaces.spaceSolutionBadge.observability"
        defaultMessage="Observability"
      />
    ),
  },
  classic: {
    iconType: 'logoElasticStack',
    label: (
      <FormattedMessage id="xpack.spaces.spaceSolutionBadge.classic" defaultMessage="Classic" />
    ),
  },
};

function resolveSolutionOptionKey(solution?: Space['solution']): NonNullable<Space['solution']> {
  if (solution && solution in SolutionOptions) {
    return solution as NonNullable<Space['solution']>;
  }
  return 'classic';
}

/** EUI icon type for the space solution view (aligned with {@link SpaceSolutionBadge}). */
export function getSpaceSolutionIconType(solution?: Space['solution']): string {
  return SolutionOptions[resolveSolutionOptionKey(solution)].iconType;
}

export type SpaceSolutionBadgeProps = Omit<EuiBadgeProps, 'iconType'> & {
  solution?: Space['solution'];
  /**
   * Subdued inline label for compact rows (e.g. space picker) — no badge border or padding.
   * @default 'badge'
   */
  variant?: 'badge' | 'subduedText';
};

export const SpaceSolutionBadge = ({
  solution,
  variant = 'badge',
  ...badgeProps
}: SpaceSolutionBadgeProps) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const { iconType, label } = useMemo(() => {
    const key = resolveSolutionOptionKey(solution);
    return SolutionOptions[key];
  }, [solution]);

  if (variant === 'subduedText') {
    return (
      <span
        css={css`
          display: inline-flex;
          align-items: center;
          gap: ${euiTheme.size.xs};
          padding: 0;
          margin: 0;
          border: none;
          outline: none;
          box-shadow: none;
          background: transparent;
          color: ${euiTheme.colors.textSubdued};
          font-weight: ${euiTheme.font.weight.regular};
          ${euiFontSize(euiThemeContext, 's', { unit: 'px' })};
        `}
      >
        <EuiIcon type={iconType} size="s" color="subdued" />
        {label}
      </span>
    );
  }

  return (
    <EuiBadge {...(badgeProps as EuiBadgeProps)} iconType={iconType} color="hollow">
      {label}
    </EuiBadge>
  );
};
