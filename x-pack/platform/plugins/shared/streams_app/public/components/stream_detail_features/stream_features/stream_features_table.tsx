/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, type ReactNode } from 'react';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiScreenReaderOnly,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { type Streams, type Feature, isFeatureWithFilter } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { ConditionPanel } from '../../data_management/shared';
import { FeatureEventsSparkline } from './feature_events_sparkline';
import { FeatureDetailExpanded } from './feature_detail_expanded';
import { TableTitle } from './table_title';
import { useStreamFeaturesTable } from './hooks/use_stream_features_table';

// Helper function to generate unique copy name
const generateCopyName = (originalName: string, existingFeatures: Feature[]) => {
  const existingNames = new Set(existingFeatures.map((f) => f.name));
  let copyNumber = 1;
  let copyName = `${originalName}-copy-${copyNumber}`;

  while (existingNames.has(copyName)) {
    copyNumber++;
    copyName = `${originalName}-copy-${copyNumber}`;
  }

  return copyName;
};

export function StreamFeaturesTable({
  definition,
  features,
  selectedFeatureNames,
  setSelectedFeatureNames,
  setFeatures,
}: {
  definition: Streams.all.Definition;
  features: Feature[];
  selectedFeatureNames: Set<string>;
  setSelectedFeatureNames: React.Dispatch<React.SetStateAction<Set<string>>>;
  setFeatures: React.Dispatch<React.SetStateAction<Feature[]>>;
}) {
  const [expandedFeatureNames, setExpandedFeatureNames] = useState<Set<string>>(new Set());

  const itemIdToExpandedRowMap = useMemo(() => {
    const map: Record<string, ReactNode> = {};
    features.forEach((f) => {
      if (expandedFeatureNames.has(f.name)) {
        map[f.name] = <FeatureDetailExpanded feature={f} setFeatures={setFeatures} />;
      }
    });
    return map;
  }, [expandedFeatureNames, features, setFeatures]);

  const selectedFeatures = useMemo(() => {
    return features.filter((f) => selectedFeatureNames.has(f.name));
  }, [features, selectedFeatureNames]);

  const onSelectionChange = useCallback(
    (newSelectedFeatures: Feature[]) => {
      setSelectedFeatureNames(new Set(newSelectedFeatures.map((f) => f.name)));
    },
    [setSelectedFeatureNames]
  );

  const { descriptionColumn } = useStreamFeaturesTable();

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
    descriptionColumn,
    {
      name: i18n.translate('xpack.streams.streamFeatureTable.columns.filter', {
        defaultMessage: 'Filter',
      }),
      width: '25%',
      render: (feature: Feature) => {
        if (feature.filter) {
          return <ConditionPanel condition={feature.filter} />;
        }
      },
    },
    {
      name: i18n.translate('xpack.streams.streamFeatureTable.columns.eventsLast24Hours', {
        defaultMessage: 'Events (last 24 hours)',
      }),
      width: '20%',
      render: (feature: Feature) => {
        if (isFeatureWithFilter(feature)) {
          return <FeatureEventsSparkline feature={feature} definition={definition} />;
        }
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
            setFeatures((prev) =>
              prev.concat({ ...feature, name: generateCopyName(feature.name, features) })
            );
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
            setExpandedFeatureNames((prev) => new Set(prev).add(feature.name));
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
            setFeatures(
              features.filter((selectedFeature) => selectedFeature.name !== feature.name)
            );
            setSelectedFeatureNames(
              new Set(
                Array.from(selectedFeatureNames).filter(
                  (selectedFeatureName) => selectedFeatureName !== feature.name
                )
              )
            );
            setExpandedFeatureNames((prev) => {
              const next = new Set(prev);
              next.delete(feature.name);
              return next;
            });
          },
        },
      ],
    },
  ];

  const toggleDetails = useCallback((feature: Feature) => {
    setExpandedFeatureNames((prev) => {
      const next = new Set(prev);
      if (next.has(feature.name)) {
        next.delete(feature.name);
      } else {
        next.add(feature.name);
      }
      return next;
    });
  }, []);

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
        const isExpanded = expandedFeatureNames.has(feature.name);

        return (
          <EuiButtonIcon
            onClick={() => toggleDetails(feature)}
            aria-label={
              isExpanded
                ? i18n.translate('xpack.streams.streamFeaturesTable.columns.collapseDetails', {
                    defaultMessage: 'Collapse details',
                  })
                : i18n.translate('xpack.streams.streamFeaturesTable.columns.expandDetails', {
                    defaultMessage: 'Expand details',
                  })
            }
            iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
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
        selection={{
          selected: selectedFeatures,
          onSelectionChange,
        }}
      />
    </>
  );
}
