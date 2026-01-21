/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type System, type Streams } from '@kbn/streams-schema';
import { EuiMarkdownFormat, type EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConditionPanel } from '../../../data_management/shared';
import { FeatureEventsSparklineLast24hrs } from '../feature_events_sparkline';

export const useStreamFeaturesTable = ({ definition }: { definition: Streams.all.Definition }) => {
  const nameColumn: EuiBasicTableColumn<System> = {
    field: 'name',
    name: TITLE_LABEL,
    sortable: true,
    truncateText: true,
  };

  const filterColumn: EuiBasicTableColumn<System> = {
    name: FILTER_LABEL,
    width: '30%',
    render: (feature: System) => {
      return <ConditionPanel condition={feature.filter} />;
    },
  };

  const descriptionColumn: EuiBasicTableColumn<System> = {
    field: 'description',
    name: DESCRIPTION_LABEL,
    truncateText: {
      lines: 4,
    },
    render: (description: string) => (
      <EuiMarkdownFormat textSize="xs">{description}</EuiMarkdownFormat>
    ),
  };

  const eventsLast24HoursColumn: EuiBasicTableColumn<System> = {
    name: EVENTS_LAST_24_HOURS_LABEL,
    width: '15%',
    render: (feature: System) => {
      return <FeatureEventsSparklineLast24hrs feature={feature} definition={definition} />;
    },
  };

  return {
    nameColumn,
    descriptionColumn,
    filterColumn,
    eventsLast24HoursColumn,
  };
};

const DESCRIPTION_LABEL = i18n.translate('xpack.streams.streamFeaturesTable.columns.description', {
  defaultMessage: 'Description',
});

const TITLE_LABEL = i18n.translate('xpack.streams.streamFeaturesTable.columns.title', {
  defaultMessage: 'Title',
});

const FILTER_LABEL = i18n.translate('xpack.streams.streamFeaturesTable.columns.filter', {
  defaultMessage: 'Filter',
});

const EVENTS_LAST_24_HOURS_LABEL = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.eventsLast24Hours',
  {
    defaultMessage: 'Events (last 24 hours)',
  }
);
