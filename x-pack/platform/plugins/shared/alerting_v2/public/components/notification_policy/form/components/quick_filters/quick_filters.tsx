/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiCode,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFormRow,
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
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDebouncedValue } from '@kbn/react-hooks';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { useFetchRules } from '../../../../../hooks/use_fetch_rules';
import { EPISODE_STATUS_FILTER_OPTIONS, type EpisodeStatusFilterOption } from '../../constants';
import {
  mergeEpisodeStatusIntoMatcher,
  mergeRuleIdsIntoMatcher,
  mergeRuleTagsIntoMatcher,
  parseEpisodeStatusesFromMatcher,
  parseRuleIdsFromMatcher,
  parseRuleTagsFromMatcher,
} from '../../matcher_quick_filter_utils';

interface QuickFiltersProps {
  matcher: string;
  onChange: (matcher: string) => void;
}

const POPOVER_PANEL_STYLE: CSSProperties = {
  width: 'max-content',
  maxWidth: 'min(440px, calc(100vw - 48px))',
};

const selectableWrapperCss = css`
  box-sizing: border-box;
  width: max-content;
  max-width: min(440px, calc(100vw - 48px));
  min-width: 0;
`;

const selectableIntrinsicWidthCss = css`
  width: fit-content;
  max-width: 100%;
`;

const SELECTABLE_LIST_PROPS = {
  isVirtualized: false as const,
  textWrap: 'wrap' as const,
  bordered: true,
  showIcons: true,
};

const RULE_LIST_ROW_ESTIMATE_PX = 72;
const RULE_LIST_MIN_HEIGHT_PX = 120;
const RULE_LIST_MAX_HEIGHT_PX = 260;

// --- Rule Filter ---

interface RuleSelectableMeta {
  value: string;
  rule: RuleResponse | null;
}

const kindLabel = (kind: RuleResponse['kind']): string =>
  kind === 'alert'
    ? i18n.translate('xpack.alertingV2.notificationPolicy.form.quickFilters.rule.kind.alert', {
        defaultMessage: 'Alert',
      })
    : i18n.translate('xpack.alertingV2.notificationPolicy.form.quickFilters.rule.kind.signal', {
        defaultMessage: 'Signal',
      });

const RuleFilter = ({ matcher, onChange }: QuickFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading } = useFetchRules({
    page: 1,
    perPage: 50,
    search: debouncedSearch || undefined,
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

  const handleRuleSelectableChange = useCallback(
    (newOptions: Array<EuiSelectableOption<RuleSelectableMeta>>) => {
      const ids = newOptions.filter((o) => o.checked === 'on').map((o) => o.value);
      onChange(mergeRuleIdsIntoMatcher(matcher, ids));
    },
    [matcher, onChange]
  );

  const ruleListHeight = useMemo(() => {
    const n = ruleOptions.length;
    if (n === 0) return RULE_LIST_MIN_HEIGHT_PX;
    return Math.min(
      RULE_LIST_MAX_HEIGHT_PX,
      Math.max(RULE_LIST_MIN_HEIGHT_PX, n * RULE_LIST_ROW_ESTIMATE_PX + 24)
    );
  }, [ruleOptions.length]);

  const renderRuleOption = useCallback((option: EuiSelectableOption<RuleSelectableMeta>) => {
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
              {i18n.translate(
                'xpack.alertingV2.notificationPolicy.form.quickFilters.rule.selectedOnly',
                { defaultMessage: 'Selected' }
              )}
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
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            font-family: monospace;
            overflow-wrap: anywhere;
          `}
        >
          {rule.id}
        </EuiText>
      </>
    );
  }, []);

  return (
    <EuiPopover
      id={rulePopoverId}
      aria-label={i18n.translate(
        'xpack.alertingV2.notificationPolicy.form.quickFilters.rule.popoverAria',
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
          {i18n.translate('xpack.alertingV2.notificationPolicy.form.quickFilters.rule', {
            defaultMessage: 'Rule',
          })}
        </EuiFilterButton>
      }
    >
      <EuiSelectable<RuleSelectableMeta>
        css={selectableIntrinsicWidthCss}
        aria-label={i18n.translate(
          'xpack.alertingV2.notificationPolicy.form.quickFilters.rule.selectableAria',
          { defaultMessage: 'Filter by rule' }
        )}
        searchable
        isPreFiltered
        isLoading={isLoading}
        height={ruleListHeight}
        options={ruleOptions}
        onChange={handleRuleSelectableChange}
        renderOption={renderRuleOption}
        searchProps={{
          value: search,
          onChange: (newSearch) => setSearch(newSearch),
          placeholder: i18n.translate(
            'xpack.alertingV2.notificationPolicy.form.quickFilters.rule.search',
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
          <div css={selectableWrapperCss}>
            <EuiPopoverTitle paddingSize="s">{searchField}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
      <EuiPopoverFooter paddingSize="s">
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.alertingV2.notificationPolicy.form.quickFilters.rule.footer"
            defaultMessage="Adds {code} to the filter"
            values={{ code: <EuiCode>{'rule.id: ("...")'}</EuiCode> }}
          />
        </EuiText>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

// --- Status Filter ---

interface StatusSelectableMeta {
  value: EpisodeStatusFilterOption['value'];
}

const StatusFilter = ({ matcher, onChange }: QuickFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const statusPopoverId = useGeneratedHtmlId({ prefix: 'npQuickFilterStatus' });

  const selectedStatuses = useMemo(() => parseEpisodeStatusesFromMatcher(matcher), [matcher]);

  const statusOptions = useMemo((): Array<EuiSelectableOption<StatusSelectableMeta>> => {
    const selectedSet = new Set(selectedStatuses);
    return EPISODE_STATUS_FILTER_OPTIONS.map((opt) => ({
      label: opt.title,
      value: opt.value,
      checked: (selectedSet.has(opt.value) ? 'on' : undefined) as EuiSelectableOption['checked'],
    }));
  }, [selectedStatuses]);

  const handleStatusChange = useCallback(
    (newOptions: Array<EuiSelectableOption<StatusSelectableMeta>>) => {
      const statuses = newOptions.filter((o) => o.checked === 'on').map((o) => o.value as string);
      onChange(mergeEpisodeStatusIntoMatcher(matcher, statuses));
    },
    [matcher, onChange]
  );

  const renderStatusOption = useCallback((option: EuiSelectableOption<StatusSelectableMeta>) => {
    const opt = EPISODE_STATUS_FILTER_OPTIONS.find((o) => o.value === option.value);
    if (!opt) return option.label;
    return (
      <>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{opt.title}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={opt.badgeColor}>{opt.value}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {opt.description}
        </EuiText>
      </>
    );
  }, []);

  return (
    <EuiPopover
      id={statusPopoverId}
      aria-label={i18n.translate(
        'xpack.alertingV2.notificationPolicy.form.quickFilters.status.popoverAria',
        { defaultMessage: 'Filter by episode status' }
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
          hasActiveFilters={selectedStatuses.length > 0}
          numActiveFilters={selectedStatuses.length}
          data-test-subj="quickFilterStatus"
        >
          {i18n.translate('xpack.alertingV2.notificationPolicy.form.quickFilters.status', {
            defaultMessage: 'Status',
          })}
        </EuiFilterButton>
      }
    >
      <EuiSelectable<StatusSelectableMeta>
        css={selectableIntrinsicWidthCss}
        aria-label={i18n.translate(
          'xpack.alertingV2.notificationPolicy.form.quickFilters.status.selectableAria',
          { defaultMessage: 'Filter by episode status' }
        )}
        searchable={false}
        options={statusOptions}
        onChange={handleStatusChange}
        renderOption={renderStatusOption}
        listProps={{
          'data-test-subj': 'quickFilterStatusList',
          ...SELECTABLE_LIST_PROPS,
        }}
      >
        {(list) => <div css={selectableWrapperCss}>{list}</div>}
      </EuiSelectable>
      <EuiPopoverFooter paddingSize="s">
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.alertingV2.notificationPolicy.form.quickFilters.status.footer"
            defaultMessage="Adds {code} to the filter"
            values={{ code: <EuiCode>{'episode_status: ("...")'}</EuiCode> }}
          />
        </EuiText>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

// --- Tags Filter ---

interface TagSelectableMeta {
  value: string;
}

const TagsFilter = ({ matcher, onChange }: QuickFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const tagsPopoverId = useGeneratedHtmlId({ prefix: 'npQuickFilterTags' });

  // Derive tags from the rules list instead of the _tags endpoint,
  // which may return empty when tags aren't indexed for aggregation.
  const { data: rulesData, isLoading } = useFetchRules({ page: 1, perPage: 1000 });
  const apiTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const rule of rulesData?.items ?? []) {
      for (const tag of rule.metadata.tags ?? []) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [rulesData]);
  const selectedTags = useMemo(() => parseRuleTagsFromMatcher(matcher), [matcher]);

  const tagOptions = useMemo((): Array<EuiSelectableOption<TagSelectableMeta>> => {
    const selectedSet = new Set(selectedTags);
    const apiTagSet = new Set(apiTags);

    // Tags in matcher but not from API (orphaned) — show at top as checked
    const orphaned = selectedTags
      .filter((t) => !apiTagSet.has(t))
      .map((tag) => ({
        label: tag,
        value: tag,
        checked: 'on' as const,
      }));

    const fromApi = apiTags.map((tag) => ({
      label: tag,
      value: tag,
      checked: (selectedSet.has(tag) ? 'on' : undefined) as EuiSelectableOption['checked'],
    }));

    return [...orphaned, ...fromApi];
  }, [apiTags, selectedTags]);

  const handleTagsChange = useCallback(
    (newOptions: Array<EuiSelectableOption<TagSelectableMeta>>) => {
      const tags = newOptions.filter((o) => o.checked === 'on').map((o) => o.value as string);
      onChange(mergeRuleTagsIntoMatcher(matcher, tags));
    },
    [matcher, onChange]
  );

  return (
    <EuiPopover
      id={tagsPopoverId}
      aria-label={i18n.translate(
        'xpack.alertingV2.notificationPolicy.form.quickFilters.tags.popoverAria',
        { defaultMessage: 'Filter by rule tags' }
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
          hasActiveFilters={selectedTags.length > 0}
          numActiveFilters={selectedTags.length}
          data-test-subj="quickFilterTags"
        >
          {i18n.translate('xpack.alertingV2.notificationPolicy.form.quickFilters.tags', {
            defaultMessage: 'Tags',
          })}
        </EuiFilterButton>
      }
    >
      <EuiSelectable<TagSelectableMeta>
        css={selectableIntrinsicWidthCss}
        aria-label={i18n.translate(
          'xpack.alertingV2.notificationPolicy.form.quickFilters.tags.selectableAria',
          { defaultMessage: 'Filter by rule tags' }
        )}
        searchable
        isLoading={isLoading}
        options={tagOptions}
        onChange={handleTagsChange}
        searchProps={{
          placeholder: i18n.translate(
            'xpack.alertingV2.notificationPolicy.form.quickFilters.tags.search',
            { defaultMessage: 'Search tags' }
          ),
          'data-test-subj': 'quickFilterTagsSearch',
        }}
        listProps={{
          'data-test-subj': 'quickFilterTagsList',
          ...SELECTABLE_LIST_PROPS,
        }}
        emptyMessage={i18n.translate(
          'xpack.alertingV2.notificationPolicy.form.quickFilters.tags.empty',
          { defaultMessage: 'No tags found on rules' }
        )}
      >
        {(list, searchField) => (
          <div css={selectableWrapperCss}>
            <EuiPopoverTitle paddingSize="s">{searchField}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
      <EuiPopoverFooter paddingSize="s">
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.alertingV2.notificationPolicy.form.quickFilters.tags.footer"
            defaultMessage="Adds {code} to the filter"
            values={{ code: <EuiCode>{'rule.tags: ("...")'}</EuiCode> }}
          />
        </EuiText>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

// --- Main Component ---

export const QuickFilters = ({ matcher, onChange }: QuickFiltersProps) => {
  return (
    <EuiFormRow
      label={i18n.translate('xpack.alertingV2.notificationPolicy.form.quickFilters.label', {
        defaultMessage: 'Quick filters',
      })}
    >
      <EuiFilterGroup data-test-subj="quickFilters">
        <RuleFilter matcher={matcher} onChange={onChange} />
        <StatusFilter matcher={matcher} onChange={onChange} />
        <TagsFilter matcher={matcher} onChange={onChange} />
      </EuiFilterGroup>
    </EuiFormRow>
  );
};
