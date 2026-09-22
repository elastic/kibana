/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { type Investigation } from '../../types';
import { ActionButton, BaseActions, type BaseActionsProps } from '../actions';
import { ACTIONS_TRANSLATIONS } from '../actions/translations';

export interface ConversationsActionsGroupProps {
  investigation: Investigation;
  onClickRecommendedAction?: ({ id }: { id: Investigation['id'] }) => void;

  onClickAction: BaseActionsProps['onClickAction'];
  /** Opens this investigation's chat. Supplied by the caller, which owns the route. */
  onOpenChat: () => void;
  /**
   * URL the chat control points at, so it behaves as a link. Optional because the caller may not
   * be able to resolve one; the control still works as a button without it.
   */
  chatHref?: string;
}

/**
 * The card's trailing controls: opening the chat, which an analyst does constantly, and
 * the menu holding everything that changes the record — including the recommended
 * action, so the card surfaces navigation rather than a decision.
 */
export const ConversationsActionsGroup = memo<ConversationsActionsGroupProps>(
  ({ investigation, onClickRecommendedAction, onClickAction, onOpenChat, chatHref }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive direction="row">
        <EuiFlexItem grow={false}>
          <ActionButton
            iconType="productAgent"
            tooltipContent={ACTIONS_TRANSLATIONS.tooltips.openInChat}
            onClick={onOpenChat}
            href={chatHref}
            data-test-subj="conversationCardOpenInChat"
          />
        </EuiFlexItem>
        <span
          aria-hidden="true"
          css={css({
            width: '1px',
            height: euiTheme.size.base,
            background: euiTheme.colors.backgroundLightText,
            marginLeft: euiTheme.size.s,
            marginRight: euiTheme.size.xs,
            [`@media (max-width: ${euiTheme.breakpoint.m}px)`]: {
              display: 'none',
            },
          })}
        />
        <EuiFlexItem grow={false}>
          <BaseActions
            investigation={investigation}
            onClickAction={onClickAction}
            onClickRecommendedAction={onClickRecommendedAction}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ConversationsActionsGroup.displayName = 'ConversationsActionsGroup';
