/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiIcon, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { type Investigation } from '../../types';
import { getActionButtonIconProps, isDecided } from '../helpers';
import { CONVERSATION_CARD_ACTIONS } from './translations';
import { BaseActions, type BaseActionsProps } from '../actions';

export interface ConversationsActionsGroupProps {
  investigation: Investigation;
  onClickRecommendedAction?: ({ id }: { id: Investigation['id'] }) => void;

  onClickAction: BaseActionsProps['onClickAction'];
  onOpenChat: BaseActionsProps['onOpenChat'];
}

export const ConversationsActionsGroup = memo<ConversationsActionsGroupProps>(
  ({ investigation, onClickRecommendedAction, onClickAction, onOpenChat }) => {
    const { euiTheme } = useEuiTheme();

    // The call to action is only meaningful while a decision is still open, and only
    // when a caller wired a handler for it. Rendering it otherwise gives the card a
    // button that submits a decision the API refuses, or does nothing at all.
    const hasRecommendedAction = Boolean(onClickRecommendedAction) && !isDecided(investigation);

    return (
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive direction="row">
        {hasRecommendedAction ? (
          <>
            <EuiFlexItem grow={false} alignItems="center" justifyContent="flexStart">
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} direction="row">
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    size="s"
                    type={getActionButtonIconProps(investigation).type}
                    color={getActionButtonIconProps(investigation).color}
                    aria-hidden={true}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    color={getActionButtonIconProps(investigation).color}
                    flush="both"
                    size="xs"
                    onClick={(event: React.MouseEvent) => {
                      event.stopPropagation();
                      onClickRecommendedAction?.({
                        id: investigation.id,
                      });
                    }}
                  >
                    {investigation.primaryActionLabel ?? CONVERSATION_CARD_ACTIONS.default}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
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
          </>
        ) : null}
        <EuiFlexItem grow={false}>
          <BaseActions
            investigation={investigation}
            onClickAction={onClickAction}
            onOpenChat={onOpenChat}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ConversationsActionsGroup.displayName = 'ConversationsActionsGroup';
