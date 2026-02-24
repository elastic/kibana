/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface SourcesUtilityBarProps {
  selectedCount: number;
}

export const SourcesUtilityBar: React.FC<SourcesUtilityBarProps> = ({ selectedCount }) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      css={({ euiTheme }) => ({
        marginBottom: euiTheme.size.m,
      })}
    >
      <EuiFlexItem grow={false} data-test-subj="sources-selected-count">
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.dataSources.utilityBar.selectedSources', {
            defaultMessage: 'Sources selected: {count}',
            values: { count: selectedCount },
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
