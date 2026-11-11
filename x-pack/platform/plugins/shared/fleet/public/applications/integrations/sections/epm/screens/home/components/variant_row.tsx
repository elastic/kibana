/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiCard, EuiTextColor } from '@elastic/eui';

import type { CollectionVariant } from '../card_utils';

// Two lines so variants sharing a common title prefix are distinguishable.
const TITLE_LINES = 2;
const DESCRIPTION_LINES = 2;

const clampStyle = (lines: number) => css`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${lines};
  overflow: hidden;
`;

const cardStyle = css`
  padding: 12px;

  .euiCard__title {
    ${clampStyle(TITLE_LINES)}
  }
`;

export interface VariantRowProps {
  variant: CollectionVariant;
}

/** One collection method inside the chooser flyout. */
export const VariantRow = ({ variant }: VariantRowProps) => (
  <EuiCard
    css={cardStyle}
    layout="horizontal"
    titleSize="xs"
    hasBorder
    paddingSize="none"
    icon={variant.icon}
    title={variant.title}
    description={
      <EuiTextColor color="subdued" css={clampStyle(DESCRIPTION_LINES)}>
        {variant.description}
      </EuiTextColor>
    }
    href={variant.href}
    onClick={variant.onClick}
    data-test-subj={variant['data-test-subj']}
  />
);
