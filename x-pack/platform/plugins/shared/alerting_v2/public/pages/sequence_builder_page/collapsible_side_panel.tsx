/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiTitle, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface CollapsibleSidePanelProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const CollapsibleSidePanel: React.FC<CollapsibleSidePanelProps> = ({
  title,
  isOpen,
  onToggle,
  children,
}) => {
  const { euiTheme } = useEuiTheme();

  const panelCss = css`
    width: ${isOpen ? '260px' : '40px'};
    flex-shrink: 0;
    overflow: hidden;
    border-right: ${euiTheme.border.thin};
    display: flex;
    flex-direction: column;
    transition: width 150ms ease;
  `;

  const toggleRowCss = css`
    display: flex;
    align-items: center;
    justify-content: ${isOpen ? 'space-between' : 'center'};
    padding: ${euiTheme.size.s};
    flex-shrink: 0;
    border-bottom: ${euiTheme.border.thin};
  `;

  const collapseLabel = i18n.translate('xpack.alertingV2.sequenceBuilderPage.collapseRuleList', {
    defaultMessage: 'Collapse rule list',
  });
  const expandLabel = i18n.translate('xpack.alertingV2.sequenceBuilderPage.expandRuleList', {
    defaultMessage: 'Expand rule list',
  });

  return (
    <div css={panelCss}>
      <div css={toggleRowCss}>
        {isOpen && (
          <EuiTitle size="xxs">
            <h4>{title}</h4>
          </EuiTitle>
        )}
        <EuiToolTip content={isOpen ? collapseLabel : expandLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType={isOpen ? 'menuLeft' : 'menuRight'}
            aria-label={isOpen ? collapseLabel : expandLabel}
            aria-expanded={isOpen}
            color="text"
            onClick={onToggle}
            data-test-subj="sequenceBuilderToggleRuleList"
          />
        </EuiToolTip>
      </div>
      {isOpen && (
        <div
          css={css`
            flex: 1;
            overflow-y: auto;
            padding: ${euiTheme.size.s};
          `}
        >
          {children}
        </div>
      )}
    </div>
  );
};
