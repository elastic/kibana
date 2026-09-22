/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  type IconType,
  type EuiContextMenuItemProps,
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHorizontalRule,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { type Investigation } from '../../types';
import type { ConversationsActionsGroupProps } from '../conversation_card';
import { CONVERSATION_CARD_ACTIONS } from '../conversation_card/translations';
import { ActionButton } from './action_button';
import { ACTIONS_TRANSLATIONS } from './translations';
import { getActionButtonIconProps, isDecided } from '../helpers';

interface ActionConfig {
  key: string;
  icon: IconType;
  color?: EuiContextMenuItemProps['color'];
  name: string;
  onClick: () => void;
  /** Inserts a horizontal rule before this item */
  separator?: boolean;
}

const useContextMenuItems = (
  actions: ActionConfig[],
  onClose: () => void
): React.ReactElement[] => {
  const { euiTheme } = useEuiTheme();
  return useMemo(
    () =>
      actions.flatMap(({ key, icon, color = 'text', name, onClick, separator }) => {
        const item = (
          <EuiContextMenuItem
            style={{
              padding: `${euiTheme.size.xs} ${euiTheme.size.m}`,
            }}
            key={key}
            icon={icon}
            color={color}
            onClick={(ev) => {
              ev.stopPropagation();
              onClose();
              onClick();
            }}
          >
            {name}
          </EuiContextMenuItem>
        );
        return separator
          ? [<EuiHorizontalRule key={`${key}-separator`} margin="none" />, item]
          : [item];
      }),
    [actions, euiTheme.size.xs, euiTheme.size.m, onClose]
  );
};

export type CardActionType = 'createEscalation' | 'addToEscalation' | 'close' | 'assign';

/**
 * Returns true when at least one action will appear in the menu for this investigation.
 * Use this to decide whether to render the menu trigger at all; an empty menu should not
 * be reachable.
 */
export const hasAvailableActions = (
  investigation: Investigation,
  canManageEscalations = false
): boolean => !isDecided(investigation) || canManageEscalations;
export interface BaseActionsProps {
  investigation: Investigation;
  isFlyout?: boolean;
  onClickAction: (action: CardActionType, recordId: Investigation['recordId']) => void;
  onClickRecommendedAction?: ConversationsActionsGroupProps['onClickRecommendedAction'];
  /** When true the escalation actions (create / add-to) appear in the menu. Requires the manage capability. */
  canManageEscalations?: boolean;
  'data-test-subj'?: string;
}

export const BaseActions = memo<BaseActionsProps>(
  ({
    investigation,
    isFlyout = false,
    onClickAction,
    onClickRecommendedAction,
    canManageEscalations = false,
    'data-test-subj': dataTestSubj,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const handleClose = useCallback(() => setIsOpen(false), []);
    const handleToggle = useCallback(() => setIsOpen((prev) => !prev), []);

    const button = isFlyout ? (
      <EuiButton
        size="s"
        color="primary"
        fill
        iconType="chevronSingleDown"
        iconSide="right"
        onClick={handleToggle}
        data-test-subj={dataTestSubj ? `${dataTestSubj}-button` : undefined}
      >
        {ACTIONS_TRANSLATIONS.buttons.actions}
      </EuiButton>
    ) : (
      <ActionButton
        data-test-subj={dataTestSubj ? `${dataTestSubj}-button` : undefined}
        iconType="boxesVertical"
        tooltipContent={ACTIONS_TRANSLATIONS.tooltips.openMenu}
        onClick={handleToggle}
      />
    );

    // A decided investigation keeps only the read-only items: approving, assigning or
    // dismissing it again would submit a decision the API refuses.
    const decided = isDecided(investigation);

    const actionConfigs = useMemo<ActionConfig[]>(
      () => [
        // First item, and the only one that carries the action's own icon and colour:
        // it is the decision the card is asking for, the rest are housekeeping.
        ...(onClickRecommendedAction && !decided
          ? [
              {
                key: 'proposedAction',
                icon: getActionButtonIconProps(investigation).type,
                color: getActionButtonIconProps(investigation).color,
                name: investigation.primaryActionLabel ?? CONVERSATION_CARD_ACTIONS.default,
                onClick: () =>
                  onClickRecommendedAction({
                    id: investigation.id,
                  }),
              },
            ]
          : []),
        ...(canManageEscalations
          ? [
              {
                key: 'createEscalation',
                icon: 'document' as IconType,
                name: ACTIONS_TRANSLATIONS.buttons.openEscalation,
                onClick: () => onClickAction('createEscalation', investigation.recordId),
              },
              {
                key: 'addToEscalation',
                icon: 'link' as IconType,
                name: ACTIONS_TRANSLATIONS.buttons.addToEscalation,
                onClick: () => onClickAction('addToEscalation', investigation.recordId),
              },
            ]
          : []),
        ...(decided
          ? []
          : [
              {
                key: 'assign',
                icon: 'user',
                name: ACTIONS_TRANSLATIONS.buttons.assign,
                onClick: () => onClickAction('assign', investigation.recordId),
              },
              {
                key: 'close',
                icon: 'cross',
                name: ACTIONS_TRANSLATIONS.buttons.close,
                onClick: () => onClickAction('close', investigation.recordId),
                separator: true,
              },
            ]),
      ],
      [onClickRecommendedAction, decided, investigation, onClickAction, canManageEscalations]
    );

    const items = useContextMenuItems(actionConfigs, handleClose);

    // Hook order is stable; we check emptiness after all hooks have run.
    if (items.length === 0) return null;

    return (
      <EuiPopover
        anchorPosition="downRight"
        panelPaddingSize="none"
        data-test-subj={dataTestSubj}
        button={button}
        isOpen={isOpen}
        closePopover={handleClose}
        aria-label={ACTIONS_TRANSLATIONS.popover.ariaLabel}
      >
        <EuiContextMenuPanel
          css={`
            padding: 0;
          `}
          items={items}
          data-test-subj={dataTestSubj ? `${dataTestSubj}-panel` : undefined}
        />
      </EuiPopover>
    );
  }
);

BaseActions.displayName = 'BaseActions';
