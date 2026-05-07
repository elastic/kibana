/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiSplitPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface SectionWrapperProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const SectionWrapper = ({ title, children, defaultOpen }: SectionWrapperProps) => {
  const isCollapsible = defaultOpen !== undefined;
  const [isOpen, setIsOpen] = useState(defaultOpen ?? true);

  const onToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <EuiSplitPanel.Outer hasShadow={false} hasBorder>
      <EuiSplitPanel.Inner color="subdued" paddingSize="s">
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          {isCollapsible && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType={isOpen ? 'arrowDown' : 'arrowRight'}
                onClick={onToggle}
                aria-label={i18n.translate(
                  'xpack.alertingV2.ruleBuilder.sectionWrapper.toggleButtonLabel',
                  {
                    defaultMessage: 'Toggle {title}',
                    values: { title },
                  }
                )}
                color="text"
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3>
                <strong>{title}</strong>
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      {isOpen ? <EuiSplitPanel.Inner>{children}</EuiSplitPanel.Inner> : null}
    </EuiSplitPanel.Outer>
  );
};
