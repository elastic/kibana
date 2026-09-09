/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { BlastRadiusItem, type BlastRadiusItemProps } from './blast_radius_item';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';

interface BlastRadiusSectionProps {
  content:
    | { variant: 'list'; items: BlastRadiusItemProps['item'][] }
    | { variant: 'description'; description: React.ReactNode };
  defaultItemIconColor?: string;
}

export const BlastRadiusSection = memo<BlastRadiusSectionProps>(
  ({ content, defaultItemIconColor }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <>
        <EuiText
          size="xs"
          css={css({
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: euiTheme.font.weight.semiBold,
            color: euiTheme.colors.textSubdued,
          })}
        >
          {APPROVAL_MODAL_TRANSLATIONS.blastRadiusTitle}
        </EuiText>
        <EuiSpacer size="s" />
        {content.variant === 'list' ? (
          <EuiFlexGroup
            component="ul"
            direction="column"
            gutterSize="s"
            responsive={false}
            css={css({ margin: 0, padding: 0 })}
          >
            {content.items.map((item) => (
              <EuiFlexItem key={item.id} grow={false}>
                <BlastRadiusItem item={item} defaultIconColor={defaultItemIconColor} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : (
          <EuiText size="s">
            <p>{content.description}</p>
          </EuiText>
        )}
      </>
    );
  }
);

BlastRadiusSection.displayName = 'BlastRadiusSection';
