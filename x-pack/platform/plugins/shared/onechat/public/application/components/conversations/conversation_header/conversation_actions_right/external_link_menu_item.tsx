/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import React from 'react';

interface ExternalLinkMenuItemProps {
  icon: string;
  href: string;
  label: string;
  dataTestSubj?: string;
  onClose?: () => void;
}

/**
 *
 * @param icon - The icon to display.
 * @param href - The href to the external link.
 * @param label - The label to display.
 * @param dataTestSubj - The data-test-subj to display.
 * @param onClose - The function to call when the menu item is clicked.
 * @returns A React component that displays a context menu item with an external link icon.
 */
export const ExternalLinkMenuItem: React.FC<ExternalLinkMenuItemProps> = ({
  icon,
  href,
  label,
  onClose,
  dataTestSubj,
}) => (
  <EuiContextMenuItem
    icon={icon}
    size="s"
    onClick={onClose}
    href={href}
    target="_blank"
    data-test-subj={dataTestSubj}
  >
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>{label}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type="popout" size="m" />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiContextMenuItem>
);
