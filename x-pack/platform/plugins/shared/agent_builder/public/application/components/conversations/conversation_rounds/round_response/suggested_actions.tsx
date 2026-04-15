/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiIcon,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiButtonEmptyProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SuggestedAction } from '@kbn/agent-builder-common';
import { useSendMessage } from '../../../../context/send_message/send_message_context';
import { useKibana } from '../../../../hooks/use_kibana';

/**
 * Curated set of valid EUI icon names the LLM is allowed to use.
 * Kept in sync with the `suggest_follow_ups` tool schema on the server.
 */
const validEuiIcons: ReadonlySet<string> = new Set([
  'plus',
  'minus',
  'cross',
  'check',
  'pencil',
  'trash',
  'copy',
  'save',
  'refresh',
  'download',
  'upload',
  'share',
  'link',
  'search',
  'filter',
  'gear',
  'eye',
  'play',
  'playFilled',
  'pause',
  'stop',
  'send',
  'return',
  'arrowLeft',
  'arrowRight',
  'arrowDown',
  'arrowUp',
  'question',
  'help',
  'info',
  'warning',
  'alert',
  'error',
  'bulb',
  'document',
  'documents',
  'list',
  'grid',
  'calendar',
  'clock',
  'sparkles',
  'bolt',
  'comment',
  'star',
  'flag',
  'dashboardApp',
  'discoverApp',
  'visualizeApp',
]);

const BUTTON_EMPTY_COLORS: ReadonlySet<string> = new Set([
  'text',
  'primary',
  'success',
  'warning',
  'danger',
  'accent',
  'accentSecondary',
  'neutral',
  'risk',
]);

const toButtonEmptyColor = (color: string | undefined): EuiButtonEmptyProps['color'] =>
  color !== undefined && BUTTON_EMPTY_COLORS.has(color)
    ? (color as EuiButtonEmptyProps['color'])
    : 'primary';

const NAVIGATION_TOOLTIP = i18n.translate('xpack.agentBuilder.suggestedActions.navigationTooltip', {
  defaultMessage: 'Opens in a new tab',
});

interface SuggestedActionsProps {
  actions: SuggestedAction[];
}

const MAX_VISIBLE_ACTIONS = 3;

export const SuggestedActions: React.FC<SuggestedActionsProps> = ({ actions }) => {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana();
  const { sendMessage, isResponseLoading } = useSendMessage();

  const handlePromptClick = useCallback(
    (prompt: string) => {
      sendMessage({ message: prompt });
    },
    [sendMessage]
  );

  const visibleActions = useMemo(() => {
    if (actions.length <= MAX_VISIBLE_ACTIONS) {
      return actions;
    }
    const navigation = actions.filter((a) => Boolean(a.url));
    const prompts = actions.filter((a) => !a.url);
    return [...navigation, ...prompts].slice(0, MAX_VISIBLE_ACTIONS);
  }, [actions]);

  if (visibleActions.length === 0) {
    return null;
  }

  const promptPillCss = css`
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
  `;

  const navigationPillCss = css`
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
  `;

  return (
    <EuiFlexGroup
      gutterSize="s"
      wrap
      responsive={false}
      data-test-subj="suggestedActions"
      css={css`
        padding-top: ${euiTheme.size.xs};
      `}
    >
      {visibleActions.map((action, index) => {
        const isNavigation = Boolean(action.url);
        const resolvedIcon =
          action.icon && validEuiIcons.has(action.icon) ? action.icon : undefined;

        if (isNavigation) {
          const href = services.http.basePath.prepend(action.url!);

          const button = (
            <EuiButtonEmpty
              size="s"
              iconType={resolvedIcon}
              color="text"
              href={href}
              target="_blank"
              rel="noopener"
              disabled={isResponseLoading}
              data-test-subj={`suggestedAction-${index}`}
              css={navigationPillCss}
            >
              {action.label}
              <EuiIcon
                type="popout"
                size="s"
                aria-hidden={true}
                css={css`
                  margin-left: ${euiTheme.size.xs};
                `}
              />
            </EuiButtonEmpty>
          );

          return (
            <EuiFlexItem grow={false} key={`${action.url}-${index}`}>
              <EuiToolTip content={NAVIGATION_TOOLTIP}>{button}</EuiToolTip>
            </EuiFlexItem>
          );
        }

        return (
          <EuiFlexItem grow={false} key={`${action.prompt}-${index}`}>
            <EuiButtonEmpty
              size="s"
              iconType={resolvedIcon}
              color={toButtonEmptyColor(action.color)}
              onClick={() => handlePromptClick(action.prompt)}
              disabled={isResponseLoading}
              data-test-subj={`suggestedAction-${index}`}
              css={promptPillCss}
            >
              {action.label}
            </EuiButtonEmpty>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
