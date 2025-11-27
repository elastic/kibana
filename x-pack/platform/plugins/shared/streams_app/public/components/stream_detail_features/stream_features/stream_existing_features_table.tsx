/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiHorizontalRule,
  EuiSpacer,
  EuiButtonEmpty,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
} from '@elastic/eui';
import { EuiButtonIcon, EuiScreenReaderOnly } from '@elastic/eui';
import { type Streams, isFeatureWithFilter, type Feature } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { useAIFeatures } from '../../stream_detail_significant_events_view/add_significant_event_flyout/generated_flow_form/use_ai_features';
import { ConditionPanel } from '../../data_management/shared';
import {
  OPEN_SIGNIFICANT_EVENTS_FLYOUT_URL_PARAM,
  SELECTED_FEATURES_URL_PARAM,
} from '../../../constants';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamFeaturesApi } from '../../../hooks/use_stream_features_api';
import { StreamFeatureDetailsFlyout } from './stream_feature_details_flyout';
import { FeatureEventsSparkline } from './feature_events_sparkline';
import { TableTitle } from './table_title';
import { useStreamFeaturesTable } from './hooks/use_stream_features_table';

export function StreamExistingFeaturesTable({
  isLoading,
  features,
  definition,
  refreshFeatures,
}: {
  isLoading?: boolean;
  features: Feature[];
  definition: Streams.all.Definition;
  refreshFeatures: () => void;
}) {
  const router = useStreamsAppRouter();

  const [selectedFeature, setSelectedFeature] = useState<Feature>();
  const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
  const { removeFeaturesFromStream } = useStreamFeaturesApi(definition);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const aiFeatures = useAIFeatures();
  const { descriptionColumn } = useStreamFeaturesTable();

  const goToGenerateSignificantEvents = (significantEventsFeatures: Feature[]) => {
    router.push('/{key}/management/{tab}', {
      path: { key: definition.name, tab: 'significantEvents' },
      query: {
        [OPEN_SIGNIFICANT_EVENTS_FLYOUT_URL_PARAM]: 'true',
        [SELECTED_FEATURES_URL_PARAM]: significantEventsFeatures.map((f) => f.name).join(','),
      },
    });
  };

  const columns: Array<EuiBasicTableColumn<Feature>> = [
    {
      field: 'name',
      name: TITLE_LABEL,
      width: '15%',
      sortable: true,
      truncateText: true,
    },
    descriptionColumn,
    {
      name: FILTER_LABEL,
      width: '30%',
      render: (feature: Feature) => {
        if (isFeatureWithFilter(feature)) {
          return <ConditionPanel condition={feature.filter} />;
        }
      },
    },
    {
      name: EVENTS_LAST_24_HOURS_LABEL,
      width: '15%',
      render: (feature: Feature) => {
        if (isFeatureWithFilter(feature)) {
          return <FeatureEventsSparkline feature={feature} definition={definition} />;
        }
      },
    },
    {
      name: ACTIONS_COLUMN_HEADER_LABEL,
      width: '5%',
      actions: [
        {
          name: GENERATE_SIGNIFICANT_EVENTS,
          description: GENERATE_SIGNIFICANT_EVENTS,
          type: 'icon',
          icon: 'crosshairs',
          enabled: () => (aiFeatures?.genAiConnectors.selectedConnector ? true : false),
          onClick: (feature) => {
            goToGenerateSignificantEvents([feature]);
          },
        },
        {
          name: EDIT_ACTION_NAME_LABEL,
          description: EDIT_ACTION_DESCRIPTION_LABEL,
          type: 'icon',
          icon: 'pencil',
          onClick: (feature) => {
            setSelectedFeature(feature);
          },
        },
        {
          name: DELETE_ACTION_NAME_LABEL,
          description: DELETE_ACTION_DESCRIPTION_LABEL,
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          onClick: (feature: Feature) => {
            setIsDeleting(true);
            removeFeaturesFromStream([feature])
              .then(() => {
                refreshFeatures();
              })
              .finally(() => {
                setIsDeleting(false);
              });
          },
        },
      ],
    },
  ];

  const toggleDetails = (feature: Feature) => {
    setSelectedFeature(feature);
  };

  const columnsWithExpandingRowToggle: Array<EuiBasicTableColumn<Feature>> = [
    {
      align: 'right',
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>{OPEN_DETAILS_LABEL}</span>
        </EuiScreenReaderOnly>
      ),
      render: (feature: Feature) => {
        return (
          <EuiButtonIcon
            onClick={() => toggleDetails(feature)}
            aria-label={selectedFeature ? COLLAPSE_DETAILS_LABEL : EXPAND_DETAILS_LABEL}
            iconType={selectedFeature ? 'minimize' : 'expand'}
          />
        );
      },
    },
    ...columns,
  ];

  const isGenerateSignificantEventsButtonDisabled =
    selectedFeatures.length === 0 || !aiFeatures?.genAiConnectors.selectedConnector;

  return (
    <div css={{ padding: '16px' }}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <TableTitle
            pageIndex={pageIndex}
            pageSize={pageSize}
            total={features.length}
            label={FEATURES_LABEL}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink
            onClick={() => {
              goToGenerateSignificantEvents(selectedFeatures);
            }}
          >
            <EuiButtonEmpty
              disabled={isGenerateSignificantEventsButtonDisabled}
              iconType="crosshairs"
              size="xs"
              aria-label={GENERATE_SIGNIFICANT_EVENTS}
            >
              {GENERATE_SIGNIFICANT_EVENTS}
            </EuiButtonEmpty>
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            size="xs"
            aria-label={CLEAR_SELECTION}
            isDisabled={selectedFeatures.length === 0 || isLoading}
            onClick={() => {
              setSelectedFeatures([]);
            }}
          >
            {CLEAR_SELECTION}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            isLoading={isDeleting}
            size="xs"
            iconType="trash"
            color="danger"
            aria-label={DELETE_ALL}
            isDisabled={selectedFeatures.length === 0 || isLoading}
            onClick={() => {
              setIsDeleting(true);
              removeFeaturesFromStream(selectedFeatures)
                .then(() => {
                  setSelectedFeatures([]);
                })
                .finally(() => {
                  refreshFeatures();
                  setIsDeleting(false);
                });
            }}
          >
            {DELETE_ALL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiInMemoryTable
        loading={isLoading}
        tableCaption={TABLE_CAPTION_LABEL}
        items={features}
        itemId="name"
        columns={columnsWithExpandingRowToggle}
        noItemsMessage={i18n.translate('xpack.streams.streamFeaturesTable.noFeaturesMessage', {
          defaultMessage: 'No features found',
        })}
        selection={{
          initialSelected: selectedFeatures,
          onSelectionChange: setSelectedFeatures,
          selected: selectedFeatures,
        }}
        pagination={{
          pageSize,
          pageSizeOptions: [5, 10, 25],
          onChangePage: (pIndex) => {
            setPageIndex(pIndex);
          },
          onChangeItemsPerPage: (pSize) => {
            setPageSize(pSize);
            setPageIndex(0);
          },
        }}
      />
      {selectedFeature && (
        <StreamFeatureDetailsFlyout
          definition={definition}
          feature={selectedFeature}
          closeFlyout={() => {
            setSelectedFeature(undefined);
          }}
          refreshFeatures={refreshFeatures}
        />
      )}
    </div>
  );
}

const CLEAR_SELECTION = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.actions.clearSelection',
  { defaultMessage: 'Clear selection' }
);

const DELETE_ALL = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.actions.deleteSelection',
  {
    defaultMessage: 'Delete selected',
  }
);

const GENERATE_SIGNIFICANT_EVENTS = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.actions.generate',
  { defaultMessage: 'Generate significant events' }
);

// i18n labels moved to end of file
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

const ACTIONS_COLUMN_HEADER_LABEL = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.actionsColumnHeader',
  {
    defaultMessage: 'Actions',
  }
);

const EDIT_ACTION_NAME_LABEL = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.actions.editActionName',
  {
    defaultMessage: 'Edit',
  }
);

const EDIT_ACTION_DESCRIPTION_LABEL = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.actions.editActionDescription',
  { defaultMessage: 'Edit this feature' }
);

const DELETE_ACTION_NAME_LABEL = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.actions.deleteActionName',
  {
    defaultMessage: 'Delete',
  }
);

const DELETE_ACTION_DESCRIPTION_LABEL = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.actions.deleteActionDescription',
  { defaultMessage: 'Delete this feature' }
);

const OPEN_DETAILS_LABEL = i18n.translate('xpack.streams.streamFeaturesTable.columns.openDetails', {
  defaultMessage: 'Open details',
});

const COLLAPSE_DETAILS_LABEL = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.collapseDetails',
  {
    defaultMessage: 'Collapse details',
  }
);

const EXPAND_DETAILS_LABEL = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.expandDetails',
  {
    defaultMessage: 'Expand details',
  }
);

const FEATURES_LABEL = i18n.translate('xpack.streams.streamFeaturesTable.tableTitle', {
  defaultMessage: 'Features',
});

const TABLE_CAPTION_LABEL = i18n.translate('xpack.streams.streamFeaturesTable.tableCaption', {
  defaultMessage: 'List of features',
});
