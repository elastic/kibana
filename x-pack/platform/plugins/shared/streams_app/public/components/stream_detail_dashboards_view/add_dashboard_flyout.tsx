/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPopover,
  EuiPopoverTitle,
  EuiSearchBar,
  EuiSelectable,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import React, { useMemo, useState, useEffect } from 'react';
import type { SanitizedDashboardAsset } from '@kbn/streams-plugin/server/routes/dashboards/route';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { DashboardsTable } from './dashboard_table';

export function AddDashboardFlyout({
  entityId,
  onAddDashboards,
  linkedDashboards,
  onClose,
}: {
  entityId: string;
  onAddDashboards: (dashboard: SanitizedDashboardAsset[]) => Promise<void>;
  linkedDashboards: SanitizedDashboardAsset[];
  onClose: () => void;
}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
        savedObjectsTagging: { ui: savedObjectsTaggingUi },
      },
    },
  } = useKibana();

  const [query, setQuery] = useState('');

  const [submittedQuery, setSubmittedQuery] = useState(query);
  const [selectedDashboards, setSelectedDashboards] = useState<SanitizedDashboardAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const setSubmittedQueryDebounced = useMemo(() => {
    return debounce(setSubmittedQuery, 150);
  }, []);

  const dashboardSuggestionsFetch = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient
        .fetch('POST /api/streams/{name}/dashboards/_suggestions', {
          signal,
          params: {
            path: {
              name: entityId,
            },
            query: {
              query: submittedQuery,
            },
            body: {
              tags: selectedTags,
            },
          },
        })
        .then(({ suggestions }) => {
          return {
            dashboards: suggestions.filter((dashboard) => {
              return !linkedDashboards.find(
                (linkedDashboard) => linkedDashboard.id === dashboard.id
              );
            }),
          };
        });
    },
    [streamsRepositoryClient, entityId, submittedQuery, selectedTags, linkedDashboards]
  );

  const tagList = savedObjectsTaggingUi.getTagList();

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      badgeColor="success"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      isSelected={isPopoverOpen}
      numFilters={tagList.length}
      hasActiveFilters={selectedTags.length > 0}
      numActiveFilters={selectedTags.length}
    >
      {i18n.translate('xpack.streams.addDashboardFlyout.filterButtonLabel', {
        defaultMessage: 'Tags',
      })}
    </EuiFilterButton>
  );

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'filterGroupPopover',
  });

  useEffect(() => {
    setSelectedDashboards([]);
  }, [linkedDashboards]);

  const allDashboards = useMemo(() => {
    return dashboardSuggestionsFetch.value?.dashboards || [];
  }, [dashboardSuggestionsFetch.value]);

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.streams.addDashboardFlyout.flyoutHeaderLabel', {
              defaultMessage: 'Add dashboards',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiText size="s">
            {i18n.translate('xpack.streams.addDashboardFlyout.helpLabel', {
              defaultMessage:
                'Select dashboards which you want to add and assign to the {stream} stream',
              values: {
                stream: entityId,
              },
            })}
          </EuiText>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem grow>
              <EuiSearchBar
                box={{
                  incremental: true,
                }}
                query={query}
                onChange={({ queryText }) => {
                  setQuery(queryText);
                  setSubmittedQueryDebounced(queryText);
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFilterGroup>
                <EuiPopover
                  id={filterGroupPopoverId}
                  button={button}
                  isOpen={isPopoverOpen}
                  closePopover={() => setIsPopoverOpen(false)}
                  panelPaddingSize="none"
                >
                  <EuiSelectable
                    allowExclusions
                    searchable
                    searchProps={{
                      placeholder: i18n.translate(
                        'xpack.streams.addDashboardFlyout.searchTagsLabel',
                        {
                          defaultMessage: 'Search tags',
                        }
                      ),
                      compressed: true,
                    }}
                    options={(tagList || []).map((tag) => ({
                      label: tag.name,
                      checked: selectedTags.includes(tag.id) ? 'on' : undefined,
                    }))}
                    onChange={(newOptions) => {
                      setSelectedTags(
                        newOptions
                          .filter((option) => option.checked === 'on')
                          .map((option) => savedObjectsTaggingUi.getTagIdFromName(option.label)!)
                      );
                    }}
                  >
                    {(list, search) => (
                      <div style={{ width: 300 }}>
                        <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
                        {list}
                      </div>
                    )}
                  </EuiSelectable>
                </EuiPopover>
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <DashboardsTable
            dashboards={allDashboards}
            loading={dashboardSuggestionsFetch.loading}
            selectedDashboards={selectedDashboards}
            setSelectedDashboards={setSelectedDashboards}
          />
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton
          isLoading={isLoading}
          disabled={selectedDashboards.length === 0}
          data-test-subj="streamsAppAddDashboardFlyoutAddDashboardsButton"
          onClick={async () => {
            setIsLoading(true);
            try {
              await onAddDashboards(selectedDashboards);
            } finally {
              setIsLoading(false);
            }
          }}
        >
          {i18n.translate('xpack.streams.addDashboardFlyout.addDashboardsButtonLabel', {
            defaultMessage: 'Add dashboards',
          })}
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
