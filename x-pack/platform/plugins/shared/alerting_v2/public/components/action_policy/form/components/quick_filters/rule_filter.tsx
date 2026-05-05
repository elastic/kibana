/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiCode,
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
  type EuiSelectableOption,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDebouncedValue } from '@kbn/react-hooks';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { useFetchRules } from '../../../../../hooks/use_fetch_rules';
import { mergeRuleIdsIntoMatcher, parseRuleIdsFromMatcher } from '../../matcher_quick_filter_utils';
import { POPOVER_PANEL_STYLE, SELECTABLE_LIST_PROPS, type QuickFiltersProps } from './constants';

interface RuleSelectableMeta {
  value: string;
  rule: RuleResponse | null;
}

const kindLabel = (kind: RuleResponse['kind']): string =>
  kind === 'alert'
    ? i18n.translate('xpack.alertingV2.actionPolicy.form.quickFilters.rule.kind.alert', {
        defaultMessage: 'Alerting',
      })
    : i18n.translate('xpack.alertingV2.actionPolicy.form.quickFilters.rule.kind.signal', {
        defaultMessage: 'Detect only',
      });

export const RuleFilter = ({ matcher, onChange }: QuickFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading } = useFetchRules({
    page: 1,
    perPage: 50,
    search: debouncedSearch || undefined,
    enabled: isOpen,
  });
  const items = data?.items;

  const selectedRuleIds = useMemo(() => parseRuleIdsFromMatcher(matcher), [matcher]);
  const rulePopoverId = useGeneratedHtmlId({ prefix: 'npQuickFilterRule' });

  const ruleOptions = useMemo((): Array<EuiSelectableOption<RuleSelectableMeta>> => {
    const list = items ?? [];
    const selectedSet = new Set(selectedRuleIds);
    const loadedIds = new Set(list.map((r) => r.id));

    const fromApi = list.map((rule) => ({
      label: rule.metadata.name,
      searchableLabel: `${rule.metadata.name} ${rule.id}`,
      key: rule.id,
      value: rule.id,
      rule,
      checked: (selectedSet.has(rule.id) ? 'on' : undefined) as EuiSelectableOption['checked'],
    }));

    // Show selected rules that aren't in the current search results
    const synthetic = selectedRuleIds
      .filter((id) => !loadedIds.has(id))
      .map((id) => ({
        label: id,
        searchableLabel: id,
        key: id,
        value: id,
        rule: null as RuleResponse | null,
        checked: 'on' as const,
      }));

    return [...synthetic, ...fromApi];
  }, [items, selectedRuleIds]);

  const handleRuleSelectableChange = (
    newOptions: Array<EuiSelectableOption<RuleSelectableMeta>>
  ) => {
    const ids = newOptions.filter((o) => o.checked === 'on').map((o) => o.value);
    onChange(mergeRuleIdsIntoMatcher(matcher, ids));
  };

  const renderRuleOption = (option: EuiSelectableOption<RuleSelectableMeta>) => {
    const { rule } = option;
    if (!rule) {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow>
            <EuiText size="s">
              <strong>{option.label}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('xpack.alertingV2.actionPolicy.form.quickFilters.rule.selectedOnly', {
                defaultMessage: 'Selected',
              })}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    return (
      <>
        <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
          <EuiFlexItem grow>
            <EuiText size="s">
              <strong>{rule.metadata.name}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{kindLabel(rule.kind)}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {rule.id}
        </EuiText>
      </>
    );
  };

  return (
    <EuiPopover
      id={rulePopoverId}
      aria-label={i18n.translate(
        'xpack.alertingV2.actionPolicy.form.quickFilters.rule.popoverAria',
        { defaultMessage: 'Filter by rule' }
      )}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      panelStyle={POPOVER_PANEL_STYLE}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsOpen((o) => !o)}
          isSelected={isOpen}
          hasActiveFilters={selectedRuleIds.length > 0}
          numActiveFilters={selectedRuleIds.length}
          data-test-subj="quickFilterRule"
        >
          {i18n.translate('xpack.alertingV2.actionPolicy.form.quickFilters.rule', {
            defaultMessage: 'Rule',
          })}
        </EuiFilterButton>
      }
    >
      <EuiSelectable<RuleSelectableMeta>
        aria-label={i18n.translate(
          'xpack.alertingV2.actionPolicy.form.quickFilters.rule.selectableAria',
          { defaultMessage: 'Filter by rule' }
        )}
        searchable
        isPreFiltered
        isLoading={isLoading}
        options={ruleOptions}
        onChange={handleRuleSelectableChange}
        renderOption={renderRuleOption}
        searchProps={{
          value: search,
          onChange: (newSearch) => setSearch(newSearch),
          placeholder: i18n.translate(
            'xpack.alertingV2.actionPolicy.form.quickFilters.rule.search',
            { defaultMessage: 'Search rules' }
          ),
          'data-test-subj': 'quickFilterRuleSearch',
        }}
        listProps={{
          'data-test-subj': 'quickFilterRuleList',
          ...SELECTABLE_LIST_PROPS,
        }}
      >
        {(list, searchField) => (
          <>
            <EuiPopoverTitle paddingSize="s">{searchField}</EuiPopoverTitle>
            {list}
          </>
        )}
      </EuiSelectable>
      <EuiPopoverFooter paddingSize="s">
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.quickFilters.rule.footer"
            defaultMessage="Adds {code} to the filter"
            values={{ code: <EuiCode>{'rule.id: ("...")'}</EuiCode> }}
          />
        </EuiText>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
