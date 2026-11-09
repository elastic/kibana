/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiSelectableOption,
} from '@elastic/eui';
import type { CaseUI } from '../../../../../common/ui/types';
import {
  EMPTY_RELATED_FILTERS,
  caseViewSectionRegistry,
  isRelatedFilterActive,
  type RelatedByReason,
  type RelatedFilters,
} from '../../../../client/case_view_sections';
import { useCasesContext } from '../../../cases_context/use_cases_context';
import { useRefreshCaseViewPage } from '../../use_on_refresh_case_view_page';
import { SidebarToggleButton } from '../sidebar/sidebar_toggle_button';
import { RelatedCasesSection } from './related_cases_section';
import * as i18n from './translations';

/**
 * The reasons Phase 3 can compute. Event and Dashboard have no data source yet, so they aren't
 * offered rather than offered and always empty.
 */
export const COMPUTABLE_REASONS: RelatedByReason[] = ['linked', 'observable', 'alert', 'aiVerdict'];

const RelatedByFilter: React.FC<{
  value: RelatedByReason[];
  onChange: (value: RelatedByReason[]) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId();
  const options: EuiSelectableOption[] = COMPUTABLE_REASONS.map((reason) => ({
    key: reason,
    label: i18n.RELATED_BY_LABELS[reason],
    checked: value.includes(reason) ? 'on' : undefined,
    'data-test-subj': `related-by-option-${reason}`,
  }));
  return (
    <EuiPopover
      id={popoverId}
      aria-label={i18n.RELATED_BY}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          hasActiveFilters={value.length > 0}
          numActiveFilters={value.length}
          numFilters={COMPUTABLE_REASONS.length}
          data-test-subj="related-by-filter-button"
        >
          {i18n.RELATED_BY}
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        aria-label={i18n.RELATED_BY}
        options={options}
        onChange={(next) =>
          onChange(next.filter((o) => o.checked === 'on').map((o) => o.key as RelatedByReason))
        }
        data-test-subj="related-by-filter-list"
      >
        {(list) => <div style={{ width: 220 }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
};

/**
 * The Related tab with agentic cases on: the Related by and Status filters, then each plugin's
 * section (investigations), then the Cases section. Cases owns the filters; each section applies
 * them to its own rows.
 */
export const RelatedTab: React.FC<{ caseData: CaseUI }> = ({ caseData }) => {
  const { euiTheme } = useEuiTheme();
  const { permissions } = useCasesContext();
  const refreshCase = useRefreshCaseViewPage();
  const [filters, setFilters] = useState<RelatedFilters>(EMPTY_RELATED_FILTERS);
  const sections = caseViewSectionRegistry.getVisible('related', caseData);

  const toggleStatus = (status: 'open' | 'closed') =>
    setFilters((current) => ({
      ...current,
      status: current.status.includes(status)
        ? current.status.filter((s) => s !== status)
        : [...current.status, status],
    }));

  return (
    <div data-test-subj="case-view-related-tab">
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        wrap
        css={{ paddingTop: euiTheme.size.s }}
        data-test-subj="related-toolbar"
      >
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <RelatedByFilter
              value={filters.relatedBy}
              onChange={(relatedBy) => setFilters((current) => ({ ...current, relatedBy }))}
            />
            <EuiFilterButton
              withNext
              hasActiveFilters={filters.status.includes('open')}
              onClick={() => toggleStatus('open')}
              data-test-subj="related-status-open"
            >
              {i18n.STATUS_OPEN}
            </EuiFilterButton>
            <EuiFilterButton
              hasActiveFilters={filters.status.includes('closed')}
              onClick={() => toggleStatus('closed')}
              data-test-subj="related-status-closed"
            >
              {i18n.STATUS_CLOSED}
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>
        {isRelatedFilterActive(filters) ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              onClick={() => setFilters(EMPTY_RELATED_FILTERS)}
              data-test-subj="related-clear-filters"
            >
              {i18n.CLEAR_FILTERS}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={true}>
          <EuiText size="xs" color="subdued">
            {i18n.RESTRICTED_NOTE}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SidebarToggleButton />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {sections.map((section) => (
        <div key={section.id} data-test-subj={`case-view-related-section-${section.id}`}>
          {section.render({
            caseData,
            canUpdate: permissions.update,
            refreshCase,
            relatedFilters: filters,
          })}
          <EuiSpacer size="l" />
        </div>
      ))}
      <RelatedCasesSection caseData={caseData} canUpdate={permissions.update} filters={filters} />
    </div>
  );
};
RelatedByFilter.displayName = 'RelatedByFilter';
RelatedTab.displayName = 'RelatedTab';
