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
import { i18n } from '@kbn/i18n';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import type { Entity } from './fake_entities';
import { buildFakeEntities } from './fake_entities';
import { GroupedGridView } from './grouped_grid_view';
import { EntitiesListView } from './entities_list_view';
import { EntityDetailsFlyout } from './entity_details_flyout';

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
  const dataset = useMemo(() => buildFakeEntities(), []);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  const filteredEntities = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return dataset.entities;
    return dataset.entities.filter((entity) => entity.name.toLowerCase().includes(query));
  }, [dataset.entities, search]);

  return (
    <>
      <StreamsAppPageTemplate.Header
        pageTitle={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.streams.entityCentricLab.entities.title', {
                defaultMessage: 'All entities ({count})',
                values: { count: dataset.totalEntities.toLocaleString() },
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
        <EuiSpacer size="m" />
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('xpack.streams.entityCentricLab.entities.summary', {
                  defaultMessage: '{entities} Entities · {groups} Groups',
                  values: {
                    entities: dataset.totalEntities.toLocaleString(),
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
          <GroupedGridView dataset={dataset} />
        ) : (
          <EntitiesListView
            entities={filteredEntities}
            onSelectEntity={(entity) => setSelectedEntity(entity)}
          />
        )}
      </StreamsAppPageTemplate.Body>
      {selectedEntity ? (
        <EntityDetailsFlyout entity={selectedEntity} onClose={() => setSelectedEntity(null)} />
      ) : null}
    </>
  );
};
