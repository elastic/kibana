/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface SourcesUtilityBarProps {
  selectedCount: number;
  onBulkDelete: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

export const SourcesUtilityBar: React.FC<SourcesUtilityBarProps> = ({
  selectedCount,
  onBulkDelete,
  onSelectAll,
  onClearSelection,
}) => {
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
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.dataSources.utilityBar.selectedSources"
            defaultMessage="Sources selected: {count}"
            values={{ count: <strong>{selectedCount}</strong> }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="none">
          <EuiButtonEmpty
            aria-label={i18n.translate('xpack.dataSources.utilityBar.deleteSelectedAriaLabel', {
              defaultMessage: 'Delete {count, plural, one {# source} other {# sources}}',
              values: { count: selectedCount },
            })}
            data-test-subj="sourcesBulkDeleteButton"
            iconType="trash"
            iconSize="m"
            size="xs"
            color="danger"
            onClick={onBulkDelete}
            css={({ euiTheme }) => ({
              fontWeight: euiTheme.font.weight.semiBold,
            })}
          >
            <FormattedMessage
              id="xpack.dataSources.utilityBar.deleteSelectedButton"
              defaultMessage="Delete {count, plural, one {# source} other {# sources}}"
              values={{ count: selectedCount }}
            />
          </EuiButtonEmpty>
          <EuiButtonEmpty
            aria-label={i18n.translate('xpack.dataSources.utilityBar.selectAllAriaLabel', {
              defaultMessage: 'Select all',
            })}
            data-test-subj="sourcesSelectAllButton"
            iconType="pagesSelect"
            iconSize="m"
            size="xs"
            onClick={onSelectAll}
            css={({ euiTheme }) => ({
              fontWeight: euiTheme.font.weight.semiBold,
            })}
          >
            <FormattedMessage
              id="xpack.dataSources.utilityBar.selectAllButton"
              defaultMessage="Select all"
            />
          </EuiButtonEmpty>
          <EuiButtonEmpty
            aria-label={i18n.translate('xpack.dataSources.utilityBar.clearSelectionAriaLabel', {
              defaultMessage: 'Clear selection',
            })}
            data-test-subj="sourcesClearSelectionButton"
            iconType="cross"
            iconSize="m"
            size="xs"
            onClick={onClearSelection}
            css={({ euiTheme }) => ({
              fontWeight: euiTheme.font.weight.semiBold,
            })}
          >
            <FormattedMessage
              id="xpack.dataSources.utilityBar.clearSelectionButton"
              defaultMessage="Clear selection"
            />
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
