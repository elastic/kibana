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

  const [query, setQuery] = useState('');
  const [foundDashboards, setFoundDashboards] = useState<Array<{ title: string; id: string }>>([]);

  const fetchDashboards = React.useCallback(
    async (search: string = '') => {
      const findDashboardsService = await dashboardStart.findDashboardsService();
      const searchResults = await findDashboardsService.search({
        per_page: 10000,
        search,
      });

      setFoundDashboards(
        searchResults.dashboards.map(({ id, data }) => ({
          title: data.title,
          id,
        }))
      );
    },
    [dashboardStart]
  );

  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  const handleQueryChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    fetchDashboards(event.target.value);
  };

  const onSelectionChange = (newSelectedItems: { id: string; title: string }[]) => {
    setFormData({
      ...formData,
      dashboards: newSelectedItems,
    });
  };

  const availableDashboards = foundDashboards.filter((dashboard) => {
    const matchesQuery =
      query === '' || dashboard.title.toLowerCase().includes(query.toLowerCase());
    const alreadySelected = formData.dashboards.some((item) => item.id === dashboard.id);
    return matchesQuery && !alreadySelected;
  });

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          {i18n.translate('xpack.streams.groupStreamModificationFlyout.selectedDashboardsLabel', {
            defaultMessage: 'Selected',
          })}
          <EuiSpacer size="m" />
          {formData.dashboards.length === 0
            ? i18n.translate(
                'xpack.streams.groupStreamModificationFlyout.noSelectedDashboardsLabel',
                {
                  defaultMessage: 'No dashboards selected',
                }
              )
            : formData.dashboards.map((dashboard) => (
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
                        const newSelected = formData.dashboards.filter(
                          (d) => d.id !== dashboard.id
                        );
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
            onChange={handleQueryChange}
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
                          onSelectionChange([...formData.dashboards, dashboard]);
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
