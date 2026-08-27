/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  euiMinBreakpoint,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

export interface CreateOptionItem {
  id: string;
  iconType: string;
  title: string;
  description: string;
  onClick: () => void;
  /** When `true`, the option is rendered disabled and its click is a no-op. */
  disabled?: boolean;
  /** When set, this string is shown as a hover/focus tooltip, independent of `disabled`. */
  tooltipText?: string;
  'data-test-subj'?: string;
}

export interface CreateOptionsPanelProps {
  title: ReactElement;
  icon?: ReactElement;
  items: CreateOptionItem[];
  secondaryItems?: CreateOptionItem[];
  secondaryLabel?: ReactNode;
  'data-test-subj'?: string;
}

const LIST_EMPTY_STATE_MAX_INLINE_SIZE = '44em';

const listEmptyStateStyles = {
  parent: css({
    display: 'flex',
    flexGrow: 1,
    height: '100%',
    width: '100%',
  }),
  template: css({
    backgroundColor: 'inherit',
    marginInline: 'auto',
    maxInlineSize: LIST_EMPTY_STATE_MAX_INLINE_SIZE,
    width: '100%',
  }),
  widgetContainer: (euiThemeContext: UseEuiTheme) => {
    const { euiTheme } = euiThemeContext;
    return css({
      padding: euiTheme.size.xl,
      borderRadius: euiTheme.border.radius.medium,
      width: '100%',
      maxInlineSize: LIST_EMPTY_STATE_MAX_INLINE_SIZE,
      boxSizing: 'border-box',
      [euiMinBreakpoint(euiThemeContext, 'm')]: {
        width: LIST_EMPTY_STATE_MAX_INLINE_SIZE,
      },
      '.euiEmptyPrompt__icon': {
        marginBottom: euiTheme.size.l,
        paddingRight: euiTheme.size.s,
      },
      '.euiEmptyPrompt__content, .euiEmptyPrompt__actions': {
        maxInlineSize: '100%',
        width: '100%',
      },
    });
  },
  actionsWrapper: css({
    width: '100%',
    maxInlineSize: '100%',
    marginInline: 'auto',
  }),
  actionPanel: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: `${euiTheme.size.m} ${euiTheme.size.l}`,
      cursor: 'pointer',
      minWidth: 0,
      width: '100%',
      display: 'block',
    }),
  actionPanelTextWrapper: css({ minWidth: 0 }),
};

const actionPanelDisabledStyle = css({
  cursor: 'not-allowed',
  opacity: 0.5,
});

const noop = () => undefined;

export const CreateOptionActionPanel: React.FC<{
  item: CreateOptionItem;
  actionPanelStyle: React.ComponentProps<typeof EuiPanel>['css'];
}> = ({ item, actionPanelStyle }) => {
  const isDisabled = item.disabled === true;
  const hasTooltip = item.tooltipText !== undefined;
  const panel = (
    <EuiPanel
      element="button"
      hasBorder
      paddingSize="none"
      aria-disabled={isDisabled || undefined}
      onClick={isDisabled ? noop : item.onClick}
      css={[actionPanelStyle, isDisabled && actionPanelDisabledStyle]}
      data-test-subj={item['data-test-subj']}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={item.iconType} size="l" color="text" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem css={listEmptyStateStyles.actionPanelTextWrapper}>
          <EuiText size="s">
            <strong>{item.title}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {item.description}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  if (hasTooltip) {
    return (
      <EuiToolTip content={item.tooltipText} display="block">
        {panel}
      </EuiToolTip>
    );
  }

  return panel;
};

const SectionDivider: React.FC<{ label: ReactNode }> = ({ label }) => (
  <>
    <EuiSpacer size="s" />
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="l" />
  </>
);

/** Config-driven empty state panel for list pages. */
export const CreateOptionsPanel: React.FC<CreateOptionsPanelProps> = ({
  title,
  icon,
  items,
  secondaryItems,
  secondaryLabel,
  'data-test-subj': dataTestSubj,
}) => {
  const styles = useMemoCss(listEmptyStateStyles);

  return (
    <div css={styles.parent} data-test-subj={dataTestSubj}>
      <EuiPageTemplate grow={false} offset={0} css={styles.template}>
        <EuiPageTemplate.EmptyPrompt
          paddingSize="none"
          icon={icon}
          title={title}
          actions={
            <EuiFlexGroup direction="column" gutterSize="s" css={styles.actionsWrapper}>
              {items.map((item) => (
                <EuiFlexItem key={item.id} grow={false}>
                  <CreateOptionActionPanel item={item} actionPanelStyle={styles.actionPanel} />
                </EuiFlexItem>
              ))}
              {secondaryItems != null && secondaryItems.length > 0 && (
                <EuiFlexItem grow={false}>
                  {secondaryLabel != null && <SectionDivider label={secondaryLabel} />}
                  {secondaryItems.map((item) => (
                    <CreateOptionActionPanel
                      key={item.id}
                      item={item}
                      actionPanelStyle={styles.actionPanel}
                    />
                  ))}
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
          titleSize="xs"
          color="transparent"
          css={styles.widgetContainer}
        />
      </EuiPageTemplate>
    </div>
  );
};
