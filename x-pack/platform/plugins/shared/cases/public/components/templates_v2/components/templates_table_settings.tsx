/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme, EuiText, EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';
import type { Template } from '../../../../common/types/domain/template/v1';
import { TemplatesBulkActions } from './templates_bulk_actions';
import * as i18n from '../translations';

export interface TemplatesTableSettingsProps {
  rangeStart: number;
  rangeEnd: number;
  totalTemplates: number;
  selectedTemplates: Template[];
  onBulkActionSuccess: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
}

const TemplatesTableSettingsComponent: React.FC<TemplatesTableSettingsProps> = ({
  rangeStart,
  rangeEnd,
  totalTemplates,
  selectedTemplates,
  onBulkActionSuccess,
  hasFilters,
  onClearFilters,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      justifyContent="flexStart"
      alignItems="center"
      gutterSize="s"
      css={css`
        border-bottom: ${euiTheme.border.thin};
        padding-top: ${euiTheme.size.s};
        padding-bottom: ${euiTheme.size.s};
      `}
    >
      <EuiFlexItem
        grow={false}
        data-test-subj="templates-table-count"
        css={css`
          border-right: ${euiTheme.border.thin};
          padding-right: ${euiTheme.size.s};
          padding-bottom: ${euiTheme.size.s};
          padding-top: ${euiTheme.size.s};
        `}
      >
        <EuiText size="xs" color="subdued">
          {i18n.SHOWING}{' '}
          <strong>
            {rangeStart}
            {'-'}
            {rangeEnd}
          </strong>{' '}
          {i18n.SHOWING_TEMPLATES(totalTemplates)}
        </EuiText>
      </EuiFlexItem>
      <TemplatesBulkActions
        selectedTemplates={selectedTemplates}
        onActionSuccess={onBulkActionSuccess}
      />
      {hasFilters && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={onClearFilters}
            size="xs"
            iconSide="left"
            iconType="cross"
            flush="left"
            data-test-subj="templates-clear-filters-link-icon"
          >
            {i18n.CLEAR_FILTERS}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

TemplatesTableSettingsComponent.displayName = 'TemplatesTableSettingsComponent';

export const TemplatesTableSettings = React.memo(TemplatesTableSettingsComponent);
