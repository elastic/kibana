/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';

export interface FlyoutNavigationProps {
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
  children: React.ReactNode;
}

/**
 * Navigation menu on the right panel only, with expand/collapse button and option to
 * pass in a list of actions to be displayed on top.
 */

export const FlyoutNavigation = memo<FlyoutNavigationProps>(
  ({ isExpanded, setIsExpanded, children }) => {
    const collapseDetails = useCallback(() => setIsExpanded(false), [setIsExpanded]);

    const collapseButton = useMemo(
      () => (
        <EuiButtonEmpty
          iconSide="left"
          onClick={collapseDetails}
          iconType="menuRight"
          size="xs"
          aria-label={i18n.translate(
            'xpack.elasticAssistant.flyout.right.header.collapseDetailButtonAriaLabel',
            {
              defaultMessage: 'Hide chats',
            }
          )}
        >
          <FormattedMessage
            id="xpack.elasticAssistant.flyout.right.header.collapseDetailButtonLabel"
            defaultMessage="Hide chats"
          />
        </EuiButtonEmpty>
      ),
      [collapseDetails]
    );

    const expandButton = useMemo(
      () => (
        <EuiButtonEmpty
          iconSide="left"
          onClick={() => setIsExpanded(true)}
          iconType="menuLeft"
          size="xs"
          aria-label={i18n.translate(
            'xpack.elasticAssistant.flyout.right.header.expandDetailButtonAriaLabel',
            {
              defaultMessage: 'Show chats',
            }
          )}
        >
          <FormattedMessage
            id="xpack.elasticAssistant.flyout.right.header.expandDetailButtonLabel"
            defaultMessage="Show chats"
          />
        </EuiButtonEmpty>
      ),
      [setIsExpanded]
    );

    return (
      <EuiPanel
        hasShadow={false}
        borderRadius="none"
        paddingSize="s"
        grow={false}
        css={css`
          border-bottom: 1px solid ${euiThemeVars.euiColorLightShade};
        `}
      >
        <EuiFlexGroup
          direction="row"
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="none"
        >
          <EuiFlexItem grow={false}>{isExpanded ? collapseButton : expandButton}</EuiFlexItem>
          {children && <EuiFlexItem grow={false}>{children}</EuiFlexItem>}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

FlyoutNavigation.displayName = 'FlyoutNavigation';
