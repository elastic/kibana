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
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
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
import { useFetchRules } from '../../../../hooks/use_fetch_rules';
import { useFetchRuleLabels } from '../../../../hooks/use_fetch_rule_labels';
import { EPISODE_STATUS_FILTER_OPTIONS, type EpisodeStatusFilterOption } from '../constants';
import {
  mergeEpisodeStatusIntoMatcher,
  mergeRuleIdsIntoMatcher,
  parseEpisodeStatusesFromMatcher,
  parseRuleIdsFromMatcher,
  parseRuleLabelsFromMatcher,
} from '../matcher_quick_filter_utils';

interface QuickFiltersProps {
  matcher: string;
  onChange: (matcher: string) => void;
}

const appendToMatcher = (current: string, clause: string): string => {
  const trimmed = current.trim();
  if (!trimmed) return clause;
  return `${trimmed} AND ${clause}`;
};

const kindLabel = (kind: RuleResponse['kind']): string =>
  kind === 'alert'
    ? i18n.translate('xpack.alertingV2.notificationPolicy.form.quickFilters.rule.kind.alert', {
        defaultMessage: 'Alert',
      })
    : i18n.translate('xpack.alertingV2.notificationPolicy.form.quickFilters.rule.kind.signal', {
        defaultMessage: 'Signal',
      });

interface RuleSelectableMeta {
  value: string;
  rule: RuleResponse | null;
}

/** Multi-line selectable rows need non-virtualized list; tune height to content up to a max to avoid huge empty space. */
const RULE_LIST_ROW_ESTIMATE_PX = 72;
const RULE_LIST_MIN_HEIGHT_PX = 120;
const RULE_LIST_MAX_HEIGHT_PX = 260;

const selectableListPropsRichRows = {
  isVirtualized: false as const,
  textWrap: 'wrap' as const,
  bordered: true,
  showIcons: true,
};

/** Shrink popover to content instead of stretching to the form column */
const QUICK_FILTER_POPOVER_PANEL_STYLE: CSSProperties = {
  width: 'max-content',
  maxWidth: 'min(440px, calc(100vw - 48px))',
};

const quickFilterSelectableWrapperCss = css`
  box-sizing: border-box;
  width: max-content;
  max-width: min(440px, calc(100vw - 48px));
  min-width: 0;
`;

const selectableIntrinsicWidthCss = css`
  width: fit-content;
  max-width: 100%;
`;

const RuleFilter = ({
  matcher,
  onChange,
}: {
  matcher: string;
  onChange: (matcher: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading } = useFetchRules({ page: 1, perPage: 50, search: debouncedSearch });

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

  const ruleCount = selectedRuleIds.length;

  const ruleListHeight = useMemo(() => {
    const n = ruleOptions.length;
    if (n === 0) {
      return RULE_LIST_MIN_HEIGHT_PX;
    }
    return Math.min(
      RULE_LIST_MAX_HEIGHT_PX,
      Math.max(RULE_LIST_MIN_HEIGHT_PX, n * RULE_LIST_ROW_ESTIMATE_PX + 24)
    );
  }, [ruleOptions.length]);

  const renderRuleOption = useCallback(
    (option: EuiSelectableOption<RuleSelectableMeta>, _searchValue: string) => {
      const rule = option.rule;
      if (!rule) {
        return (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={true}>
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
            <EuiFlexItem grow={true}>
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
            style={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}
          >
            {rule.id}
          </EuiText>
        </>
      );
    },
    []
  );

  return (
    <EuiPopover
      id={rulePopoverId}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      panelStyle={QUICK_FILTER_POPOVER_PANEL_STYLE}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsOpen((o) => !o)}
          isSelected={isOpen}
          hasActiveFilters={ruleCount > 0}
          numActiveFilters={ruleCount}
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
        allowExclusions
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
          ...selectableListPropsRichRows,
        }}
      >
        {(list, searchField) => (
          <div css={quickFilterSelectableWrapperCss}>
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
            values={{
              code: <EuiCode>rule.id: (&quot;...&quot;)</EuiCode>,
            }}
          />
        </EuiText>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

interface StatusSelectableMeta {
  value: EpisodeStatusFilterOption['value'];
}

const StatusFilter = ({
  matcher,
  onChange,
}: {
  matcher: string;
  onChange: (matcher: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const statusPopoverId = useGeneratedHtmlId({ prefix: 'npQuickFilterStatus' });

  const statusOptions = useMemo((): Array<EuiSelectableOption<StatusSelectableMeta>> => {
    const selected = new Set(parseEpisodeStatusesFromMatcher(matcher));
    return EPISODE_STATUS_FILTER_OPTIONS.map((opt) => ({
      label: opt.title,
      value: opt.value,
      checked: (selected.has(opt.value) ? 'on' : undefined) as EuiSelectableOption['checked'],
    }));
  }, [matcher]);

  const handleStatusChange = useCallback(
    (newOptions: Array<EuiSelectableOption<StatusSelectableMeta>>) => {
      const statuses = newOptions.filter((o) => o.checked === 'on').map((o) => o.value as string);
      onChange(mergeEpisodeStatusIntoMatcher(matcher, statuses));
    },
    [matcher, onChange]
  );

  const renderStatusOption = useCallback((option: EuiSelectableOption<StatusSelectableMeta>) => {
    const opt = EPISODE_STATUS_FILTER_OPTIONS.find((o) => o.value === option.value);
    if (!opt) {
      return option.label;
    }
    return (
      <>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{opt.title}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={opt.badgeColor}>{opt.badgeLabel}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {opt.description}
        </EuiText>
      </>
    );
  }, []);

  const statusCount = parseEpisodeStatusesFromMatcher(matcher).length;

  return (
    <EuiPopover
      id={statusPopoverId}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      panelStyle={QUICK_FILTER_POPOVER_PANEL_STYLE}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsOpen((o) => !o)}
          isSelected={isOpen}
          hasActiveFilters={statusCount > 0}
          numActiveFilters={statusCount}
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
        allowExclusions
        searchable={false}
        options={statusOptions}
        onChange={handleStatusChange}
        renderOption={renderStatusOption}
        listProps={{
          'data-test-subj': 'quickFilterStatusList',
          ...selectableListPropsRichRows,
        }}
      >
        {(list) => <div css={quickFilterSelectableWrapperCss}>{list}</div>}
      </EuiSelectable>
      <EuiPopoverFooter paddingSize="s">
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.alertingV2.notificationPolicy.form.quickFilters.status.footer"
            defaultMessage="Adds {code} to the filter"
            values={{
              code: <EuiCode>episode_status: (&quot;...&quot;)</EuiCode>,
            }}
          />
        </EuiText>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

const TagsFilter = ({
  matcher,
  onChange,
}: {
  matcher: string;
  onChange: (matcher: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: tags = [], isLoading } = useFetchRuleLabels();

  const filteredTags = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.toLowerCase().includes(q));
  }, [tags, search]);

  const handleSelectTag = useCallback(
    (tag: string) => {
      onChange(appendToMatcher(matcher, `rule.labels : "${tag}"`));
      setIsOpen(false);
      setSearch('');
    },
    [matcher, onChange]
  );

  const tagCount = parseRuleLabelsFromMatcher(matcher).length;

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsOpen((o) => !o)}
          isSelected={isOpen}
          hasActiveFilters={tagCount > 0}
          numActiveFilters={tagCount}
          data-test-subj="quickFilterTags"
        >
          {i18n.translate('xpack.alertingV2.notificationPolicy.form.quickFilters.tags', {
            defaultMessage: 'Tags',
          })}
        </EuiFilterButton>
      }
    >
      <EuiPopoverTitle paddingSize="s">
        <EuiFieldSearch
          fullWidth
          placeholder={i18n.translate(
            'xpack.alertingV2.notificationPolicy.form.quickFilters.tags.search',
            { defaultMessage: 'Search tags' }
          )}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-test-subj="quickFilterTagsSearch"
        />
      </EuiPopoverTitle>
      <div
        style={{ maxHeight: 280, overflowY: 'auto', minWidth: 240 }}
        data-test-subj="quickFilterTagsList"
      >
        {isLoading ? (
          <EuiFlexGroup justifyContent="center" style={{ padding: 16 }}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexGroup>
        ) : filteredTags.length === 0 ? (
          <EuiText size="s" color="subdued" style={{ padding: 12 }}>
            {i18n.translate('xpack.alertingV2.notificationPolicy.form.quickFilters.tags.empty', {
              defaultMessage: 'No tags found on rules',
            })}
          </EuiText>
        ) : (
          filteredTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleSelectTag(tag)}
              data-test-subj={`quickFilterTagOption-${tag}`}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                border: 'none',
                borderBottom: '1px solid var(--euiColorLightShade, #e9edf3)',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <EuiText size="s">{tag}</EuiText>
            </button>
          ))
        )}
      </div>
      <EuiPopoverFooter paddingSize="s">
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.alertingV2.notificationPolicy.form.quickFilters.tags.footer"
            defaultMessage="Adds {code} to the filter"
            values={{
              code: <EuiCode>tags: (&quot;...&quot;)</EuiCode>,
            }}
          />
        </EuiText>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

export const QuickFilters = ({ matcher, onChange }: QuickFiltersProps) => {
  return (
    <EuiFilterGroup data-test-subj="quickFilters">
      <RuleFilter matcher={matcher} onChange={onChange} />
      <StatusFilter matcher={matcher} onChange={onChange} />
      <TagsFilter matcher={matcher} onChange={onChange} />
    </EuiFilterGroup>
  );
};
