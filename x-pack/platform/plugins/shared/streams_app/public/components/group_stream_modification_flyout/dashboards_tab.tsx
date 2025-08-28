/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiButtonIcon, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import type { TabProps } from './types';
import { useKibana } from '../../hooks/use_kibana';

export function DashboardsTab({ formData, setFormData }: TabProps) {
  const {
    dependencies: {
      start: { dashboard: dashboardStart },
    },
  } = useKibana();

  useEffect(() => {
    setSelectedItems(formData.dashboards);
  }, [formData.dashboards]);
  const [selectedItems, setSelectedItems] = useState<{ id: string; title: string }[]>(
    formData.dashboards
  );
  const onSelectionChange = (newSelectedItems: { id: string; title: string }[]) => {
    setFormData({
      ...formData,
      dashboards: newSelectedItems,
    });
  };

  const [query, setQuery] = useState('');
  const [foundDashboards, setFoundDashboards] = useState<Array<{ title: string; id: string }>>([]);
  useEffect(() => {
    const fetchDashboards = async () => {
      const findDashboardsService = await dashboardStart.findDashboardsService();
      const searchResults = await findDashboardsService.search({
        size: 10000,
        search: query,
      });

      setFoundDashboards(
        searchResults.hits.map((hit) => ({
          title: hit.attributes.title,
          id: hit.id,
        }))
      );
    };

    fetchDashboards();
  }, [dashboardStart, query]);

  const availableDashboards = foundDashboards.filter(
    (dashboard) =>
      (query === '' || dashboard.title.toLowerCase().includes(query.toLowerCase())) &&
      !selectedItems.some((item) => item.id === dashboard.id)
  );

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          {i18n.translate('xpack.streams.groupStreamModificationFlyout.selectedDashboardsLabel', {
            defaultMessage: 'Selected',
          })}
          <EuiSpacer size="m" />
          {selectedItems.length === 0
            ? i18n.translate(
                'xpack.streams.groupStreamModificationFlyout.noSelectedDashboardsLabel',
                {
                  defaultMessage: 'No dashboards selected',
                }
              )
            : selectedItems.map((dashboard) => (
                <EuiFlexGroup key={dashboard.id} gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="cross"
                      color="danger"
                      aria-label={i18n.translate(
                        'xpack.streams.groupStreamModificationFlyout.removeDashboardButtonLabel',
                        { defaultMessage: 'Remove' }
                      )}
                      onClick={() => {
                        const newSelected = selectedItems.filter((d) => d.id !== dashboard.id);
                        onSelectionChange(newSelected);
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={1}>{dashboard.title}</EuiFlexItem>
                </EuiFlexGroup>
              ))}
        </EuiFlexItem>

        <EuiFlexItem>
          {i18n.translate('xpack.streams.groupStreamModificationFlyout.availableDashboardsLabel', {
            defaultMessage: 'Available',
          })}
          <EuiSpacer size="m" />
          <EuiFieldText
            placeholder={i18n.translate(
              'xpack.streams.groupStreamModificationFlyout.dashboardFilterPlaceholder',
              { defaultMessage: 'Filter by title...' }
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <EuiSpacer size="m" />
          {availableDashboards.length === 0
            ? query
              ? i18n.translate(
                  'xpack.streams.groupStreamModificationFlyout.noDashboardsFoundLabel',
                  {
                    defaultMessage: 'No dashboards found',
                  }
                )
              : i18n.translate(
                  'xpack.streams.groupStreamModificationFlyout.noAvailableDashboardsLabel',
                  {
                    defaultMessage: 'No available dashboards',
                  }
                )
            : availableDashboards.map((dashboard) => (
                <React.Fragment key={dashboard.id}>
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="plusInCircle"
                        aria-label={i18n.translate(
                          'xpack.streams.groupStreamModificationFlyout.addDashboardButtonLabel',
                          { defaultMessage: 'Add' }
                        )}
                        onClick={() => {
                          onSelectionChange([...selectedItems, dashboard]);
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={1}>{dashboard.title}</EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="m" />
                </React.Fragment>
              ))}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
