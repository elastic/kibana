/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DragEffects, DraggableWrapper } from '../../../drag_and_drop/draggable_wrapper';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../empty_value';
import { HostDetailsLink } from '../../../links';
import { IS_OPERATOR } from '../../../timeline/data_providers/data_provider';
import { Provider } from '../../../timeline/data_providers/provider';
import { AddFilterToGlobalSearchBar, createFilter } from '../../add_filter_to_global_search_bar';
import { AlertsTableColumns } from './';

import * as i18n from './translations';

export const getAlertsColumns = (): AlertsTableColumns => [
  {
    field: 'node.host.name',
    name: i18n.NAME,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: hostName => {
      if (hostName != null && hostName.length > 0) {
        const id = escapeDataProviderId(`alerts-table-hostName-${hostName[0]}`);
        return (
          <DraggableWrapper
            key={id}
            dataProvider={{
              and: [],
              enabled: true,
              excluded: false,
              id,
              name: hostName[0],
              kqlQuery: '',
              queryMatch: { field: 'host.name', value: hostName[0], operator: IS_OPERATOR },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <AddFilterToGlobalSearchBar filter={createFilter('host.name', hostName[0])}>
                  <HostDetailsLink hostName={hostName[0]} />
                </AddFilterToGlobalSearchBar>
              )
            }
          />
        );
      }
      return getEmptyTagValue();
    },
    width: '15%',
  },
  {
    field: 'node.event.module',
    name: i18n.MODULE,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: module => {
      if (module != null) {
        return (
          <AddFilterToGlobalSearchBar filter={createFilter('event.module', module[0])}>
            <>{module}</>
          </AddFilterToGlobalSearchBar>
        );
      }
      return getEmptyTagValue();
    },
    width: '15%',
  },
  {
    field: 'node.event.dataset',
    name: i18n.DATASET,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: dataset => {
      if (dataset != null) {
        return (
          <AddFilterToGlobalSearchBar filter={createFilter('event.dataset', dataset[0])}>
            <>{dataset}</>
          </AddFilterToGlobalSearchBar>
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'node.event.category',
    name: i18n.CATEGORY,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: category => {
      if (category != null) {
        return (
          <AddFilterToGlobalSearchBar filter={createFilter('event.category', category[0])}>
            <>{category}</>
          </AddFilterToGlobalSearchBar>
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'node.event.severity',
    name: i18n.SERVERITY,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: severity => {
      if (severity != null) {
        return (
          <AddFilterToGlobalSearchBar
            filter={createFilter('event.severity', severity[0].toString())}
          >
            <>{severity}</>
          </AddFilterToGlobalSearchBar>
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'node.observer.name',
    name: i18n.OBSERVER_NAME,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: observerName => {
      if (observerName != null) {
        return (
          <AddFilterToGlobalSearchBar filter={createFilter('observer.name', observerName)}>
            <>{observerName}</>
          </AddFilterToGlobalSearchBar>
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'node.event.message',
    name: i18n.MESSAGE,
    truncateText: false,
    hideForMobile: false,
    sortable: true,
    render: message => {
      if (message != null) {
        return (
          <AddFilterToGlobalSearchBar filter={createFilter('message', message[0])}>
            <>{message}</>
          </AddFilterToGlobalSearchBar>
        );
      }
      return getEmptyTagValue();
    },
  },
];
