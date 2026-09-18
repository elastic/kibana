/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiBadgeProps } from '@elastic/eui';
import { EuiBadge } from '@elastic/eui';
import React, { useMemo } from 'react';

import { i18n } from '@kbn/i18n';

import type { Space } from '../../common';

const SolutionOptions: Record<
  NonNullable<Space['solution']>,
  { iconType: string; label: string }
> = {
  es: {
    iconType: 'logoElasticsearch',
    label: i18n.translate('xpack.spaces.spaceSolutionBadge.elasticsearch', {
      defaultMessage: 'Elasticsearch',
    }),
  },
  workplaceai: {
    iconType: 'logoElasticsearch',
    label: i18n.translate('xpack.spaces.spaceSolutionBadge.workplaceai', {
      defaultMessage: 'Workplace AI',
    }),
  },
  vectordb: {
    iconType: 'logoVectorDB',
    label: i18n.translate('xpack.spaces.spaceSolutionBadge.vectordb', {
      defaultMessage: 'VectorDB',
    }),
  },
  security: {
    iconType: 'logoSecurity',
    label: i18n.translate('xpack.spaces.spaceSolutionBadge.security', {
      defaultMessage: 'Security',
    }),
  },
  oblt: {
    iconType: 'logoObservability',
    label: i18n.translate('xpack.spaces.spaceSolutionBadge.observability', {
      defaultMessage: 'Observability',
    }),
  },
  classic: {
    iconType: 'logoElasticStack',
    label: i18n.translate('xpack.spaces.spaceSolutionBadge.classic', {
      defaultMessage: 'Classic',
    }),
  },
};

export function getSpaceSolutionBadgeLabel(solution?: Space['solution']): string {
  if (!solution || !SolutionOptions[solution]) {
    return SolutionOptions.classic.label;
  }
  return SolutionOptions[solution].label;
}

export type SpaceSolutionBadgeProps = Omit<EuiBadgeProps, 'iconType'> & {
  solution?: Space['solution'];
};

export const SpaceSolutionBadge = ({ solution, ...badgeProps }: SpaceSolutionBadgeProps) => {
  const { iconType, label } = useMemo(() => {
    if (!solution || !SolutionOptions[solution]) {
      return SolutionOptions.classic;
    }

    return SolutionOptions[solution];
  }, [solution]);

  return (
    <EuiBadge {...(badgeProps as EuiBadgeProps)} iconType={iconType} color="hollow">
      {label}
    </EuiBadge>
  );
};
