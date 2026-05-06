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
  EuiSelectable,
  type EuiSelectableOption,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EPISODE_STATUS_FILTER_OPTIONS, type EpisodeStatusFilterOption } from '../../constants';
import {
  mergeEpisodeStatusIntoMatcher,
  parseEpisodeStatusesFromMatcher,
} from '../../matcher_quick_filter_utils';
import { POPOVER_PANEL_STYLE, SELECTABLE_LIST_PROPS, type QuickFiltersProps } from './constants';

interface StatusSelectableMeta {
  value: EpisodeStatusFilterOption['value'];
}

const KNOWN_STATUS_VALUES = new Set<string>(EPISODE_STATUS_FILTER_OPTIONS.map((o) => o.value));

export const StatusFilter = ({ matcher, onChange }: QuickFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const statusPopoverId = useGeneratedHtmlId({ prefix: 'npQuickFilterStatus' });

  const selectedStatuses = useMemo(() => parseEpisodeStatusesFromMatcher(matcher), [matcher]);
  const recognizedCount = selectedStatuses.filter((s) => KNOWN_STATUS_VALUES.has(s)).length;

  const statusOptions = useMemo((): Array<EuiSelectableOption<StatusSelectableMeta>> => {
    const selectedSet = new Set(selectedStatuses);
    return EPISODE_STATUS_FILTER_OPTIONS.map((opt) => ({
      label: opt.title,
      value: opt.value,
      checked: (selectedSet.has(opt.value) ? 'on' : undefined) as EuiSelectableOption['checked'],
    }));
  }, [selectedStatuses]);

  const handleStatusChange = (newOptions: Array<EuiSelectableOption<StatusSelectableMeta>>) => {
    const statuses = newOptions.filter((o) => o.checked === 'on').map((o) => o.value);
    onChange(mergeEpisodeStatusIntoMatcher(matcher, statuses));
  };

  const renderStatusOption = (option: EuiSelectableOption<StatusSelectableMeta>) => {
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
  };

  return (
    <EuiPopover
      id={statusPopoverId}
      aria-label={i18n.translate(
        'xpack.alertingV2.actionPolicy.form.quickFilters.status.popoverAria',
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
          hasActiveFilters={recognizedCount > 0}
          numActiveFilters={recognizedCount}
          data-test-subj="quickFilterStatus"
        >
          {i18n.translate('xpack.alertingV2.actionPolicy.form.quickFilters.status', {
            defaultMessage: 'Status',
          })}
        </EuiFilterButton>
      }
    >
      <EuiSelectable<StatusSelectableMeta>
        aria-label={i18n.translate(
          'xpack.alertingV2.actionPolicy.form.quickFilters.status.selectableAria',
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
        {(list) => <>{list}</>}
      </EuiSelectable>
      <EuiPopoverFooter paddingSize="s">
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.form.quickFilters.status.footer"
            defaultMessage="Adds {code} to the filter"
            values={{ code: <EuiCode>{'episode_status: ("...")'}</EuiCode> }}
          />
        </EuiText>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
