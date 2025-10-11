/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import {} from 'react';
import React, { useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiButtonIcon, EuiScreenReaderOnly } from '@elastic/eui';
import { type Streams, type Feature } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { ConditionPanel } from '../../shared';
import { FeatureEventsSparkline } from './feature_events_sparkline';
import { FeatureDetailExpanded } from './feature_detail_expanded';
import { TableTitle } from './table_title';

export function StreamFeaturesTable({
  definition,
  features: initialFeatures,
  selectedFeatures,
  setSelectedFeatures,
}: {
  definition: Streams.all.Definition;
  features: Feature[];
  selectedFeatures: Feature[];
  setSelectedFeatures: React.Dispatch<React.SetStateAction<Feature[]>>;
}) {
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );

  const [features, setFeatures] = useState<Feature[]>(initialFeatures);

  useEffect(() => {
    setFeatures(initialFeatures);
  }, [initialFeatures]);

  const columns: Array<EuiBasicTableColumn<Feature>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.streams.streamFeatureTable.columns.title', {
        defaultMessage: 'Title',
      }),
      width: '15%',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'description',
      name: i18n.translate('xpack.streams.streamFeatureTable.columns.description', {
        defaultMessage: 'Description',
      }),
      width: '30%',
      truncateText: {
        lines: 4,
      },
    },
    {
      field: 'filter',
      name: i18n.translate('xpack.streams.streamFeatureTable.columns.filter', {
        defaultMessage: 'Filter',
      }),
      width: '25%',
      render: (filter: Feature['filter']) => {
        return <ConditionPanel condition={filter} />;
      },
    },
    {
      name: i18n.translate('xpack.streams.streamFeatureTable.columns.eventsLast24Hours', {
        defaultMessage: 'Events (last 24 hours)',
      }),
      width: '20%',
      render: (feature: Feature) => {
        return <FeatureEventsSparkline feature={feature} definition={definition} />;
      },
    },
    {
      name: 'Actions',
      width: '5%',
      actions: [
        {
          name: i18n.translate(
            'xpack.streams.streamFeaturesTable.columns.actions.cloneActionName',
            {
              defaultMessage: 'Clone',
            }
          ),
          description: i18n.translate(
            'xpack.streams.streamFeaturesTable.columns.actions.cloneActionDescription',
            { defaultMessage: 'Clone this feature' }
          ),
          type: 'icon',
          icon: 'copy',
          onClick: (feature) => {
            // clone the feature
            setFeatures(features.concat({ ...feature, name: `${feature.name}-copy` }));
          },
        },
        {
          name: i18n.translate('xpack.streams.streamFeaturesTable.columns.actions.editActionName', {
            defaultMessage: 'Edit',
          }),
          description: i18n.translate(
            'xpack.streams.streamFeaturesTable.columns.actions.editActionDescription',
            { defaultMessage: 'Edit this feature' }
          ),
          type: 'icon',
          icon: 'pencil',
          onClick: (feature) => {
            // open expanded row
            setItemIdToExpandedRowMap(
              Object.keys(itemIdToExpandedRowMap).includes(feature.name)
                ? itemIdToExpandedRowMap
                : {
                    ...itemIdToExpandedRowMap,
                    [feature.name]: <FeatureDetailExpanded feature={feature} />,
                  }
            );
          },
        },
        {
          name: i18n.translate(
            'xpack.streams.streamFeaturesTable.columns.actions.deleteActionName',
            {
              defaultMessage: 'Delete',
            }
          ),
          description: i18n.translate(
            'xpack.streams.streamFeaturesTable.columns.actions.deleteActionDescription',
            { defaultMessage: 'Delete this feature' }
          ),
          type: 'icon',
          icon: 'trash',
          onClick: (feature) => {
            // delete the feature
            setFeatures(
              features.filter((selectedFeature) => selectedFeature.name !== feature.name)
            );
            setSelectedFeatures(
              selectedFeatures.filter((selectedFeature) => selectedFeature.name !== feature.name)
            );
            const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
            if (itemIdToExpandedRowMapValues[feature.name]) {
              delete itemIdToExpandedRowMapValues[feature.name];
              setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
            }
          },
        },
      ],
    },
  ];

  const toggleDetails = (feature: Feature) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

    if (itemIdToExpandedRowMapValues[feature.name]) {
      delete itemIdToExpandedRowMapValues[feature.name];
    } else {
      itemIdToExpandedRowMapValues[feature.name] = <FeatureDetailExpanded feature={feature} />;
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const columnsWithExpandingRowToggle: Array<EuiBasicTableColumn<Feature>> = [
    {
      align: 'right',
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('xpack.streams.streamFeaturesTable.columns.expand', {
              defaultMessage: 'Expand row',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      mobileOptions: { header: false },
      render: (feature: Feature) => {
        const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

        return (
          <EuiButtonIcon
            onClick={() => toggleDetails(feature)}
            aria-label={
              itemIdToExpandedRowMapValues[feature.name]
                ? i18n.translate('xpack.streams.streamFeaturesTable.columns.collapseDetails', {
                    defaultMessage: 'Collapse details',
                  })
                : i18n.translate('xpack.streams.streamFeaturesTable.columns.expandDetails', {
                    defaultMessage: 'Expand details',
                  })
            }
            iconType={itemIdToExpandedRowMapValues[feature.name] ? 'arrowDown' : 'arrowRight'}
          />
        );
      },
    },
    ...columns,
  ];

  return (
    <>
      <TableTitle
        pageIndex={0}
        pageSize={10}
        total={features.length}
        label={i18n.translate('xpack.streams.streamFeaturesTable.tableTitle', {
          defaultMessage: 'Features',
        })}
      />
      <EuiBasicTable
        tableCaption={i18n.translate('xpack.streams.streamFeaturesTable.tableCaption', {
          defaultMessage: 'List of features',
        })}
        items={features}
        itemId="name"
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        columns={columnsWithExpandingRowToggle}
        selection={{ selected: selectedFeatures, onSelectionChange: setSelectedFeatures }}
      />
    </>
  );
}
