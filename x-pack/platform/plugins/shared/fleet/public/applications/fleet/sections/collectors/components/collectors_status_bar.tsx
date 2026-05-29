/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiSwitch,
  EuiPopover,
  EuiSelectable,
  EuiButtonEmpty,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';

const GROUP_BY_OPTIONS: Array<{ key: string; label: string }> = [
  {
    key: 'none',
    label: i18n.translate('xpack.fleet.collectors.groupBy.none', {
      defaultMessage: 'None',
    }),
  },
  {
    key: 'collector.group',
    label: i18n.translate('xpack.fleet.collectors.groupBy.collectorGroup', {
      defaultMessage: 'Collector Group',
    }),
  },
  {
    key: 'config.name',
    label: i18n.translate('xpack.fleet.collectors.groupBy.configName', {
      defaultMessage: 'Configuration',
    }),
  },
];

interface CollectorsStatusBarProps {
  totalCount: number;
  dataUpdatedAt: number;
  isAutoRefreshOn: boolean;
  onAutoRefreshChange: (on: boolean) => void;
  selectedGroupBy: string;
  onGroupByChange: (groupBy: string) => void;
}

export const CollectorsStatusBar: React.FC<CollectorsStatusBarProps> = ({
  totalCount,
  dataUpdatedAt,
  isAutoRefreshOn,
  onAutoRefreshChange,
  selectedGroupBy,
  onGroupByChange,
}) => {
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);

  const selectableOptions: EuiSelectableOption[] = GROUP_BY_OPTIONS.map((opt) => ({
    ...opt,
    checked: opt.key === selectedGroupBy ? 'on' : undefined,
  }));

  const handleGroupByChange = useCallback(
    (options: EuiSelectableOption[]) => {
      const selected = options.find((o) => o.checked === 'on');
      if (selected?.key) {
        onGroupByChange(selected.key);
      }
      setIsGroupByOpen(false);
    },
    [onGroupByChange]
  );

  const selectedLabel =
    GROUP_BY_OPTIONS.find((o) => o.key === selectedGroupBy)?.label ?? selectedGroupBy;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m">
      <EuiFlexItem grow>
        <EuiText size="xs" color="subdued" data-test-subj="fleetCollectorsCount">
          {selectedGroupBy === 'none' ? (
            <FormattedMessage
              id="xpack.fleet.collectors.statusBar.showingCount"
              defaultMessage="Showing {count, plural, one {# collector} other {# collectors}}"
              values={{ count: totalCount }}
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.collectors.statusBar.showingGroupCount"
              defaultMessage="Showing {count, plural, one {# collector group} other {# collector groups}}"
              values={{ count: totalCount }}
            />
          )}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          {dataUpdatedAt > 0 && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="fleetCollectorsUpdatedAt">
                <FormattedMessage
                  id="xpack.fleet.collectors.statusBar.updatedAt"
                  defaultMessage="Updated {date}"
                  values={{
                    date: <FormattedRelative value={dataUpdatedAt} updateIntervalInSeconds={30} />,
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          )}

          <EuiFlexItem grow={false}>
            <EuiSwitch
              compressed
              label={
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="refresh" size="s" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {isAutoRefreshOn
                      ? i18n.translate('xpack.fleet.collectors.statusBar.autoRefreshOn', {
                          defaultMessage: 'On',
                        })
                      : i18n.translate('xpack.fleet.collectors.statusBar.autoRefreshOff', {
                          defaultMessage: 'Off',
                        })}
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              checked={isAutoRefreshOn}
              onChange={(e) => onAutoRefreshChange(e.target.checked)}
              data-test-subj="fleetCollectorsAutoRefreshToggle"
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiPopover
              aria-label={i18n.translate('xpack.fleet.collectors.statusBar.groupByPopoverLabel', {
                defaultMessage: 'Select group by field',
              })}
              button={
                <EuiButtonEmpty
                  size="xs"
                  iconType="arrowDown"
                  iconSide="right"
                  onClick={() => setIsGroupByOpen(!isGroupByOpen)}
                  data-test-subj="fleetCollectorsGroupByButton"
                >
                  <FormattedMessage
                    id="xpack.fleet.collectors.statusBar.groupBy"
                    defaultMessage="Group collectors by: {groupBy}"
                    values={{ groupBy: selectedLabel }}
                  />
                </EuiButtonEmpty>
              }
              isOpen={isGroupByOpen}
              closePopover={() => setIsGroupByOpen(false)}
              panelPaddingSize="none"
              anchorPosition="downRight"
            >
              <EuiSelectable
                singleSelection
                options={selectableOptions}
                onChange={handleGroupByChange}
                listProps={{ bordered: false }}
              >
                {(list) => list}
              </EuiSelectable>
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
