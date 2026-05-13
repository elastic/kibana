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

const GROUP_BY_OPTIONS: EuiSelectableOption[] = [
  {
    label: i18n.translate('xpack.fleet.collectors.groupBy.none', { defaultMessage: 'None' }),
    key: 'none',
    checked: 'on',
  },
];

interface CollectorsStatusBarProps {
  totalCount: number;
  dataUpdatedAt: number;
  isAutoRefreshOn: boolean;
  onAutoRefreshChange: (on: boolean) => void;
}

export const CollectorsStatusBar: React.FC<CollectorsStatusBarProps> = ({
  totalCount,
  dataUpdatedAt,
  isAutoRefreshOn,
  onAutoRefreshChange,
}) => {
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [groupByOptions, setGroupByOptions] = useState<EuiSelectableOption[]>(GROUP_BY_OPTIONS);

  const onGroupByChange = useCallback((options: EuiSelectableOption[]) => {
    setGroupByOptions(options);
    setIsGroupByOpen(false);
  }, []);

  const selectedGroupBy = groupByOptions.find((o) => o.checked === 'on')?.label ?? 'None';

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m">
      <EuiFlexItem grow>
        <EuiText size="xs" color="subdued" data-test-subj="fleetCollectorsCount">
          <FormattedMessage
            id="xpack.fleet.collectors.statusBar.showingCount"
            defaultMessage="Showing {count, plural, one {# collector} other {# collectors}}"
            values={{ count: totalCount }}
          />
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
                  values={{ date: <FormattedRelative value={dataUpdatedAt} /> }}
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
                    <EuiIcon type="refresh" size="s" />
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
                    values={{ groupBy: selectedGroupBy }}
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
                options={groupByOptions}
                onChange={onGroupByChange}
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
