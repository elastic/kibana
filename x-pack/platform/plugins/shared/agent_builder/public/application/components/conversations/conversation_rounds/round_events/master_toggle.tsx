/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface MasterToggleProps {
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Round-level master toggle for the entire steps block.
 *
 * Renders "Collapse reasoning ⌃" when the block is expanded and
 * "Show reasoning ⌄" when collapsed.
 */
export const MasterToggle: React.FC<MasterToggleProps> = ({ expanded, onToggle }) => {
  const label = expanded
    ? i18n.translate('xpack.agentBuilder.roundEvents.masterToggle.collapse', {
        defaultMessage: 'Collapse reasoning',
      })
    : i18n.translate('xpack.agentBuilder.roundEvents.masterToggle.show', {
        defaultMessage: 'Show reasoning',
      });

  return (
    <EuiLink color="subdued" onClick={onToggle} role="button">
      <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>{label}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type={expanded ? 'arrowUp' : 'arrowDown'} size="s" aria-hidden />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiLink>
  );
};
