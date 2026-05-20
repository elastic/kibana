/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getEbtProps } from '@kbn/ebt-click';
import { AGENT_BUILDER_UI_EBT, AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common';
import { labels } from '../../../utils/i18n';
import { useKibana } from '../../../hooks/use_kibana';

export interface LibraryToggleRowProps {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  onToggle: (isActive: boolean) => void;
  isDisabled?: boolean;
  isReadOnly?: boolean; // `readonly` is currently used as a soft indicator that a skill, plugin or tool was built by Elastic.
  disabledBadgeLabel?: string;
  disabledTooltipTitle?: string;
  disabledTooltipBody?: string;
  ebtEntityType?: string;
}

const EUI_TEXT_STYLES = css`
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const LibraryToggleRow: React.FC<LibraryToggleRowProps> = ({
  name,
  description,
  isActive,
  onToggle,
  isDisabled = false,
  isReadOnly = false,
  disabledBadgeLabel,
  disabledTooltipTitle,
  disabledTooltipBody,
  ebtEntityType,
}) => {
  const { agentId } = useParams<{ agentId?: string }>();
  const {
    services: { analytics },
  } = useKibana();
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
      <EuiFlexItem
        css={css`
          gap: ${euiTheme.size.xs};
        `}
      >
        <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle
              size="xs"
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
            >
              <h4>{name}</h4>
            </EuiTitle>
          </EuiFlexItem>
          {isReadOnly && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {labels.byAuthor('Elastic')}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiText size="s" color="subdued" css={EUI_TEXT_STYLES}>
          {description}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {isDisabled ? (
          <EuiToolTip
            content={
              disabledTooltipTitle || disabledTooltipBody ? (
                <>
                  {disabledTooltipTitle && (
                    <p>
                      <strong>{disabledTooltipTitle}</strong>
                    </p>
                  )}
                  {disabledTooltipTitle && disabledTooltipBody && <EuiHorizontalRule margin="xs" />}
                  {disabledTooltipBody && <p>{disabledTooltipBody}</p>}
                </>
              ) : undefined
            }
          >
            <EuiBadge tabIndex={0} color="hollow">
              {disabledBadgeLabel ?? 'Auto-included'}
            </EuiBadge>
          </EuiToolTip>
        ) : (
          <EuiSwitch
            label={name}
            showLabel={false}
            checked={isActive}
            onChange={(e) => {
              if (ebtEntityType) {
                analytics.reportEvent(
                  e.target.checked
                    ? AGENT_BUILDER_EVENT_TYPES.EntityAddFromLibrary
                    : AGENT_BUILDER_EVENT_TYPES.EntityRemove,
                  { entity_type: ebtEntityType, agent_id: agentId ?? '' }
                );
              }
              onToggle(e.target.checked);
            }}
            {...(ebtEntityType
              ? getEbtProps({
                  element: AGENT_BUILDER_UI_EBT.element.pageContent,
                  action: isActive
                    ? AGENT_BUILDER_UI_EBT.action.agentCustomization.ENTITY_REMOVE
                    : AGENT_BUILDER_UI_EBT.action.agentCustomization.ENTITY_ADD_FROM_LIBRARY,
                  detail: ebtEntityType,
                })
              : {})}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
