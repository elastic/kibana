/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useIsAgentWorkspaceMount } from '../../../application/hooks/use_navigation';
import { useConversationId } from '../../../application/context/conversation/use_conversation_id';
import { useOptionalConversationSpineContext } from '../conversation_spine_context';
import { formatSpineDisplayLabel } from '../hooks/use_spine_display_label';
import { formatSpineIdentifier } from '../hooks/use_spine_identifier';
import { getSpineTypeConfig, getBadgeStylesForVariant, PROMOTABLE_SPINE_TYPES } from '../spine_type_config';
import type { SpineBadgeVariant, SpineType } from '../types';

const badgeEntrance = keyframes`
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const typePromotion = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const labels = {
  openTypeMenu: i18n.translate('xpack.agentBuilder.conversationSpine.badge.openTypeMenu', {
    defaultMessage: 'Select spine type',
  }),
};

export interface SpineRelationshipBadgeProps {
  type: SpineType;
  identifier: string;
  variant?: SpineBadgeVariant;
}

export const SpineRelationshipBadge: React.FC<SpineRelationshipBadgeProps> = ({
  type,
  identifier,
  variant = 'ghost',
}) => {
  const { euiTheme } = useEuiTheme();
  const label = formatSpineDisplayLabel(type, identifier);
  const { iconType } = getSpineTypeConfig(type);

  return (
    <div
      key={type}
      css={css`
        animation: ${typePromotion} 150ms ease-in-out;
      `}
    >
      <EuiBadge
        iconType={iconType}
        css={getBadgeStylesForVariant(type, variant, euiTheme)}
        aria-label={label}
        data-test-subj="agentBuilderConversationSpineRelationshipBadge"
      >
        {label}
      </EuiBadge>
    </div>
  );
};

interface SpineRelationshipBadgeSelectorProps {
  type: SpineType;
  identifier: string;
  onSelectType: (type: SpineType) => void;
}

export const SpineRelationshipBadgeSelector: React.FC<SpineRelationshipBadgeSelectorProps> = ({
  type,
  identifier,
  onSelectType,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const label = formatSpineDisplayLabel(type, identifier);
  const { iconType, getInteractiveBadgeStyles } = getSpineTypeConfig(type);

  const badgeButtonStyles = css`
    ${getInteractiveBadgeStyles(euiTheme)}
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    border-radius: 12px;
    font-size: ${euiTheme.font.scale.xs}${euiTheme.font.defaultUnits};
    font-weight: ${euiTheme.font.weight.medium};
    line-height: 1;
    animation: ${typePromotion} 150ms ease-in-out;

    .euiIcon {
      color: inherit;
    }

    &:focus-visible {
      outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
    }
  `;

  const menuItems = PROMOTABLE_SPINE_TYPES.map((spineType) => {
    const config = getSpineTypeConfig(spineType);
    const isSelected = spineType === type;

    return (
      <EuiContextMenuItem
        key={spineType}
        icon={config.iconType}
        onClick={() => {
          setIsPopoverOpen(false);
          if (!isSelected) {
            onSelectType(spineType);
          }
        }}
        css={isSelected ? css`font-weight: ${euiTheme.font.weight.semiBold};` : undefined}
        data-test-subj={`agentBuilderConversationSpineTypeOption-${spineType}`}
      >
        <EuiFlexGroup responsive={false} alignItems="center" justifyContent="spaceBetween" gutterSize="m">
          <EuiFlexItem grow={false}>{config.label}</EuiFlexItem>
          {isSelected ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type="check" color="success" aria-hidden={true} />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiContextMenuItem>
    );
  });

  const badgeButton = (
    <button
      key={type}
      type="button"
      css={badgeButtonStyles}
      onClick={() => setIsPopoverOpen((open) => !open)}
      aria-expanded={isPopoverOpen}
      aria-label={`${label}. ${labels.openTypeMenu}`}
      data-test-subj="agentBuilderConversationSpineRelationshipBadgeSelector"
    >
      <EuiIcon type={iconType} size="s" aria-hidden={true} />
      <span>{label}</span>
      <EuiIcon type="arrowDown" size="s" aria-hidden={true} />
    </button>
  );

  return (
    <EuiPopover
      button={badgeButton}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      aria-label={labels.openTypeMenu}
    >
      <EuiContextMenuPanel items={menuItems} data-test-subj="agentBuilderConversationSpineTypeMenu" />
    </EuiPopover>
  );
};

export const ActiveSpineRelationshipBadge: React.FC = () => {
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const conversationId = useConversationId();
  const spineContext = useOptionalConversationSpineContext();

  if (!isAgentWorkspaceMount || !spineContext || !spineContext.hasAttachments) {
    return null;
  }

  const type = spineContext.spineState?.record.type ?? spineContext.promotedSpineType;
  const identifier =
    spineContext.spineState?.record.identifier ??
    (conversationId ? formatSpineIdentifier(conversationId) : '000');

  return (
    <div
      css={css`
        animation: ${badgeEntrance} 200ms ease-out;
      `}
    >
      <SpineRelationshipBadgeSelector
        type={type}
        identifier={identifier}
        onSelectType={spineContext.setSpineType}
      />
    </div>
  );
};
