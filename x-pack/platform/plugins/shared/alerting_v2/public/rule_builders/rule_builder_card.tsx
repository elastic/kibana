/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiCard, EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleBuilderDefinition } from './rule_builder_definitions';

const verticalCardTextLeftCss = css({
  textAlign: 'left',
  '& .euiCard__top': {
    alignSelf: 'flex-start',
  },
  '& .euiCard__icon': {
    marginInlineStart: 0,
    marginInlineEnd: 0,
  },
});

const badgeLabel = (badge: NonNullable<RuleBuilderDefinition['badge']>) => {
  if (badge === 'advanced') {
    return i18n.translate('xpack.alertingV2.ruleBuilders.badge.advanced', {
      defaultMessage: 'Advanced',
    });
  }
  return i18n.translate('xpack.alertingV2.ruleBuilders.badge.requiresTsdb', {
    defaultMessage: 'Requires TSDB',
  });
};

export interface RuleBuilderCardProps {
  builder: RuleBuilderDefinition;
  /** When set, card navigates on selection. Omit when using `onPick`. */
  href?: string;
  /** In-place selection (for example a builder picker modal). */
  onPick?: () => void;
  /** `vertical` (default): icon above text. `horizontal`: icon beside text (e.g. create hub). */
  layout?: 'vertical' | 'horizontal';
  /** When true, card is non-interactive and styled as unavailable. */
  isDisabled?: boolean;
  'data-test-subj'?: string;
}

export const RuleBuilderCard = ({
  builder,
  href,
  onPick,
  layout: cardLayout = 'vertical',
  isDisabled = false,
  'data-test-subj': dataTestSubj,
}: RuleBuilderCardProps) => {
  const betaBadgeProps =
    builder.badge !== undefined
      ? {
          label: badgeLabel(builder.badge),
          alignment: 'middle' as const,
        }
      : undefined;

  const description = (
    <>
      <EuiText size="s">
        <p>{builder.description}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.alertingV2.ruleBuilders.replacesLabel', {
          defaultMessage: 'Replaces: {list}',
          values: { list: builder.replaces },
        })}
      </EuiText>
    </>
  );

  const icon = <EuiIcon type={builder.iconType} size="l" color="text" aria-hidden={true} />;

  const sharedCardProps = {
    'data-test-subj': dataTestSubj ?? `ruleBuilderCard-${builder.id}`,
    icon,
    title: builder.title,
    titleElement: 'h3' as const,
    titleSize: 'xs' as const,
    description,
    betaBadgeProps,
    href: isDisabled ? undefined : onPick ? undefined : href,
    onClick: isDisabled ? undefined : onPick,
    isDisabled,
    hasBorder: true,
    display: 'plain' as const,
  };

  if (cardLayout === 'horizontal') {
    return <EuiCard {...sharedCardProps} layout="horizontal" />;
  }

  return (
    <EuiCard
      {...sharedCardProps}
      layout="vertical"
      textAlign="left"
      css={verticalCardTextLeftCss}
    />
  );
};
