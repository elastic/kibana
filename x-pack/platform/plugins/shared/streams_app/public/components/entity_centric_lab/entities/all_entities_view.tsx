/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonGroup,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

// The Streams page body is a column flex container with `height: 100%`.
// `EuiFlexGroup` bakes `flex-grow: 1` into its CSS with no prop to disable
// it, so any EuiFlexGroup used as a "toolbar" row would absorb the empty
// vertical space freed up when filtering shrinks the grid below — the
// "each new filter adds more space" symptom. Pin `flex-grow` to `0` so
// toolbars stay at content height.
const NO_GROW = css`
  flex-grow: 0;
`;
import { EntityFlyout, EntityFlyoutServicesProvider } from '@kbn/entity-centric-lab-flyout';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useKibana } from '../../../hooks/use_kibana';
import type { ActiveTagFilters } from './fake_entities';
import {
  EMPTY_TAG_FILTERS,
  buildFakeEntities,
  getTagFacets,
  matchesTagFilters,
} from './fake_entities';
import { GroupedGridView } from './grouped_grid_view';
import { EntitiesListView } from './entities_list_view';
import { EntitiesTagFilters } from './entities_tag_filters';

type ViewMode = 'grid' | 'list';

const VIEW_MODE_OPTIONS = [
  {
    id: 'grid' as const,
    label: i18n.translate('xpack.streams.entityCentricLab.entities.viewMode.grid', {
      defaultMessage: 'Grouped grid',
    }),
    iconType: 'apps',
  },
  {
    id: 'list' as const,
    label: i18n.translate('xpack.streams.entityCentricLab.entities.viewMode.list', {
      defaultMessage: 'List',
    }),
    iconType: 'list',
  },
];

export const AllEntitiesView = () => {
  const router = useStreamsAppRouter();
  const {
    core: { notifications },
    dependencies: {
      start: { charts },
    },
  } = useKibana();
  const dataset = useMemo(() => buildFakeEntities(), []);
  const tagFacets = useMemo(() => getTagFacets(dataset.entities), [dataset.entities]);
  const [search, setSearch] = useState('');
  const [activeTagFilters, setActiveTagFilters] = useState<ActiveTagFilters>(EMPTY_TAG_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedEntityName, setSelectedEntityName] = useState<string | null>(null);

  const filteredEntities = useMemo(() => {
    const query = search.trim().toLowerCase();
    return dataset.entities.filter((entity) => {
      if (query && !entity.name.toLowerCase().includes(query)) return false;
      return matchesTagFilters(entity, activeTagFilters);
    });
  }, [dataset.entities, search, activeTagFilters]);

  // Resolve the clicked entity's `type` and `health` from the dataset so the
  // shared flyout can pick the right kind template (service / host / pod /
  // node / cluster / namespace / database / cloud / middleware / llm) and the
  // right health variant (healthy / atRisk / unhealthy). When the user keeps
  // navigating from inside the flyout (Dependencies row clicks), the new
  // name may not be in the dataset — in that case both lookups return
  // undefined and the shared package falls back to name-based inference +
  // the `'healthy'` health variant.
  const entityByName = useMemo(() => {
    type DatasetEntity = (typeof dataset.entities)[number];
    const map = new Map<string, DatasetEntity>();
    for (const entity of dataset.entities) {
      map.set(entity.name, entity);
    }
    return map;
  }, [dataset]);
  const selectedEntity = selectedEntityName ? entityByName.get(selectedEntityName) : undefined;
  const selectedEntityType = selectedEntity?.type;
  const selectedEntityHealth = selectedEntity?.health;

  // `agentBuilder` is intentionally undefined: streams_app does not declare it
  // as a start dependency. The shared flyout hides the "Add to chat" button
  // when this is omitted, so the rest of the UI keeps working.
  const flyoutServices = useMemo(() => ({ notifications, charts }), [notifications, charts]);

  return (
    <>
      <StreamsAppPageTemplate.Header
        pageTitle={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.streams.entityCentricLab.entities.title', {
                defaultMessage: 'All entities ({count})',
                values: { count: filteredEntities.length.toLocaleString() },
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label={i18n.translate('xpack.streams.entityCentricLab.entities.labBadge', {
                  defaultMessage: 'Lab',
                })}
                size="s"
                color="hollow"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        rightSideItems={[
          <EuiButton
            key="manage"
            iconType="gear"
            onClick={() => {
              router.push('/manage-entity-types', { path: {}, query: {} });
            }}
            data-test-subj="entityCentricLabManageEntityTypesButton"
          >
            {i18n.translate('xpack.streams.entityCentricLab.entities.manageButton', {
              defaultMessage: 'Manage entity types',
            })}
          </EuiButton>,
        ]}
      />
      <StreamsAppPageTemplate.Body>
        <EuiFieldSearch
          fullWidth
          incremental
          placeholder={i18n.translate('xpack.streams.entityCentricLab.entities.searchPlaceholder', {
            defaultMessage: 'Filter entities by name',
          })}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          data-test-subj="entityCentricLabEntitiesSearch"
        />
        <EuiSpacer size="s" />
        <EntitiesTagFilters
          facets={tagFacets}
          activeFilters={activeTagFilters}
          onChange={setActiveTagFilters}
        />
        <EuiSpacer size="m" />
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap css={NO_GROW}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('xpack.streams.entityCentricLab.entities.summary', {
                  defaultMessage: '{entities} Entities · {groups} Groups',
                  values: {
                    entities: filteredEntities.length.toLocaleString(),
                    groups: dataset.totalGroups,
                  },
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.streams.entityCentricLab.entities.groupBy', {
                defaultMessage: 'Group entities by:',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSelect
              compressed
              disabled
              options={[
                {
                  value: 'categories',
                  text: i18n.translate(
                    'xpack.streams.entityCentricLab.entities.groupBy.categories',
                    { defaultMessage: 'Categories' }
                  ),
                },
              ]}
              value="categories"
              aria-label={i18n.translate(
                'xpack.streams.entityCentricLab.entities.groupBy.ariaLabel',
                { defaultMessage: 'Group entities by' }
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={i18n.translate('xpack.streams.entityCentricLab.entities.viewMode.legend', {
                defaultMessage: 'View mode',
              })}
              options={VIEW_MODE_OPTIONS}
              idSelected={viewMode}
              onChange={(id) => setViewMode(id as ViewMode)}
              isIconOnly
              data-test-subj="entityCentricLabEntitiesViewModeToggle"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="m" />
        {viewMode === 'grid' ? (
          <GroupedGridView entities={filteredEntities} onSelectEntity={setSelectedEntityName} />
        ) : (
          <EntitiesListView entities={filteredEntities} onSelectEntity={setSelectedEntityName} />
        )}
      </StreamsAppPageTemplate.Body>
      {selectedEntityName ? (
        <EntityFlyoutServicesProvider services={flyoutServices}>
          <EntityFlyout
            entityName={selectedEntityName}
            entityType={selectedEntityType}
            entityHealth={selectedEntityHealth}
            onClose={() => setSelectedEntityName(null)}
            onSelectEntity={setSelectedEntityName}
          />
        </EntityFlyoutServicesProvider>
      ) : null}
    </>
  );
};
