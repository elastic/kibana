/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { ActionImpactItem, type ActionImpactItemProps } from './action_impact_item';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';

/** The content union passed to {@link ActionImpactSection}. */
export type ActionImpactContent =
  | { variant: 'list'; items: ActionImpactItemProps['item'][] }
  | { variant: 'description'; description: React.ReactNode };

export interface ActionImpactSectionProps {
  content: ActionImpactContent;
  defaultItemIconColor?: string;
}

export const ActionImpactSection = memo<ActionImpactSectionProps>(
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
          {APPROVAL_MODAL_TRANSLATIONS.actionImpactTitle}
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
                <ActionImpactItem item={item} defaultIconColor={defaultItemIconColor} />
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

ActionImpactSection.displayName = 'ActionImpactSection';
