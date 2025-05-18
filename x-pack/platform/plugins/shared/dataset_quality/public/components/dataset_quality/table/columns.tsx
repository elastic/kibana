/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTableColumn,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSkeletonRectangle,
  EuiTableHeader,
  EuiText,
  EuiToolTip,
  formatNumber,
} from '@elastic/eui';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { BrowserUrlService } from '@kbn/share-plugin/public';
import React from 'react';
import {
  BYTE_NUMBER_FORMAT,
  DEGRADED_DOCS_QUERY,
  DEGRADED_QUALITY_MINIMUM_PERCENTAGE,
  FAILURE_STORE_SELECTOR,
  POOR_QUALITY_MINIMUM_PERCENTAGE,
} from '../../../../common/constants';
import { DataStreamStat } from '../../../../common/data_streams_stats/data_stream_stat';
import { TimeRangeConfig } from '../../../../common/types';
import { useDatasetRedirectLinkTelemetry, useRedirectLink } from '../../../hooks';
import { IntegrationIcon, PrivilegesWarningIconWrapper } from '../../common';
import { DatasetQualityIndicator, QualityIndicator } from '../../quality_indicator';
import { DatasetQualityDetailsLink } from './dataset_quality_details_link';
import { QualityStatPercentageLink } from './quality_stat_percentage_link';

const nameColumnName = i18n.translate('xpack.datasetQuality.nameColumnName', {
  defaultMessage: 'Data set name',
});

const namespaceColumnName = i18n.translate('xpack.datasetQuality.namespaceColumnName', {
  defaultMessage: 'Namespace',
});

const typeColumnName = i18n.translate('xpack.datasetQuality.typeColumnName', {
  defaultMessage: 'Type',
});

const sizeColumnName = i18n.translate('xpack.datasetQuality.sizeColumnName', {
  defaultMessage: 'Size',
});

const degradedDocsColumnName = i18n.translate('xpack.datasetQuality.degradedDocsColumnName', {
  defaultMessage: 'Degraded docs (%)',
});

const failedDocsColumnName = i18n.translate('xpack.datasetQuality.failedDocsColumnName', {
  defaultMessage: 'Failed docs (%)',
});

const datasetQualityColumnName = i18n.translate('xpack.datasetQuality.datasetQualityColumnName', {
  defaultMessage: 'Data set quality',
});

const lastActivityColumnName = i18n.translate('xpack.datasetQuality.lastActivityColumnName', {
  defaultMessage: 'Last activity',
});

const actionsColumnName = i18n.translate('xpack.datasetQuality.actionsColumnName', {
  defaultMessage: 'Actions',
});

const openActionName = i18n.translate('xpack.datasetQuality.openActionName', {
  defaultMessage: 'Open',
});

const inactiveDatasetActivityColumnDescription = i18n.translate(
  'xpack.datasetQuality.inactiveDatasetActivityColumnDescription',
  {
    defaultMessage: 'No activity in the selected timeframe',
  }
);

const inactiveDatasetActivityColumnTooltip = i18n.translate(
  'xpack.datasetQuality.inactiveDatasetActivityColumnTooltip',
  {
    defaultMessage: 'Try expanding the time range above for more results',
  }
);

const degradedDocsDescription = (
  quality: string,
  minimimPercentage: number,
  comparator: string = ''
) =>
  i18n.translate('xpack.datasetQuality.degradedDocsQualityDescription', {
    defaultMessage: '{quality} -{comparator} {minimimPercentage}%',
    values: { quality, minimimPercentage, comparator },
  });

const degradedDocsColumnTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.degradedDocsColumnTooltip"
    defaultMessage="The percentage of documents with the {ignoredProperty} property in your data set."
    values={{
      ignoredProperty: (
        <EuiCode language="json" transparentBackground>
          _ignored
        </EuiCode>
      ),
    }}
  />
);

const failedDocsColumnTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.failedDocsColumnTooltip"
    defaultMessage="The percentage of docs sent to failure store due to an issue during ingestion."
  />
);

const datasetQualityColumnTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.datasetQualityColumnTooltip"
    defaultMessage="Quality is based on the percentage of degraded and failed docs in a data set. {visualQueue}"
    values={{
      visualQueue: (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <QualityIndicator
              quality="poor"
              description={` ${degradedDocsDescription(
                'Poor',
                POOR_QUALITY_MINIMUM_PERCENTAGE,
                ' greater than'
              )}`}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <QualityIndicator
              quality="degraded"
              description={` ${degradedDocsDescription(
                'Degraded',
                DEGRADED_QUALITY_MINIMUM_PERCENTAGE,
                ' greater than'
              )}`}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <QualityIndicator
              quality="good"
              description={` ${degradedDocsDescription(
                'Good',
                DEGRADED_QUALITY_MINIMUM_PERCENTAGE
              )}`}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    }}
  />
);

export const getDatasetQualityTableColumns = ({
  fieldFormats,
  canUserMonitorDataset,
  canUserMonitorAnyDataStream,
  loadingDataStreamStats,
  loadingDocStats,
  loadingDegradedStats,
  loadingFailedStats,
  showFullDatasetNames,
  isActiveDataset,
  timeRange,
  urlService,
  isFailureStoreEnabled,
}: {
  fieldFormats: FieldFormatsStart;
  canUserMonitorDataset: boolean;
  canUserMonitorAnyDataStream: boolean;
  loadingDataStreamStats: boolean;
  loadingDocStats: boolean;
  loadingDegradedStats: boolean;
  loadingFailedStats: boolean;
  showFullDatasetNames: boolean;
  isActiveDataset: (lastActivity: number) => boolean;
  timeRange: TimeRangeConfig;
  urlService: BrowserUrlService;
  isFailureStoreEnabled: boolean;
}): Array<EuiBasicTableColumn<DataStreamStat>> => {
  return [
    {
      name: (
        <EuiTableHeader data-test-subj="datasetQualityNameColumn">{nameColumnName}</EuiTableHeader>
      ),
      field: 'title',
      sortable: true,
      render: (title: string, dataStreamStat: DataStreamStat) => {
        const { integration, name, rawName } = dataStreamStat;

        return (
          <DatasetQualityDetailsLink
            urlService={urlService}
            dataStream={rawName}
            timeRange={timeRange}
          >
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <IntegrationIcon integration={integration} />
              </EuiFlexItem>
              <EuiText size="s">{title}</EuiText>
              {showFullDatasetNames && (
                <EuiText size="xs" color="subdued">
                  <em>{name}</em>
                </EuiText>
              )}
            </EuiFlexGroup>
          </DatasetQualityDetailsLink>
        );
      },
    },
    {
      name: (
        <EuiTableHeader data-test-subj="datasetQualityNamespaceColumn">
          {namespaceColumnName}
        </EuiTableHeader>
      ),
      field: 'namespace',
      sortable: true,
      render: (_, dataStreamStat: DataStreamStat) => (
        <EuiBadge color="hollow">{dataStreamStat.namespace}</EuiBadge>
      ),
      width: '160px',
    },
    {
      name: typeColumnName,
      field: 'type',
      sortable: true,
      render: (_, dataStreamStat: DataStreamStat) => (
        <EuiBadge color="hollow">{dataStreamStat.type}</EuiBadge>
      ),
      width: '160px',
    },
    ...(canUserMonitorDataset && canUserMonitorAnyDataStream
      ? [
          {
            name: (
              <EuiTableHeader data-test-subj="datasetQualitySizeColumn">
                {sizeColumnName}
              </EuiTableHeader>
            ),
            field: 'sizeBytes',
            sortable: true,
            render: (_: any, dataStreamStat: DataStreamStat) => {
              return (
                <PrivilegesWarningIconWrapper
                  title={`sizeBytes-${dataStreamStat.title}`}
                  hasPrivileges={dataStreamStat.userPrivileges?.canMonitor ?? true}
                >
                  <EuiSkeletonRectangle
                    width="60px"
                    height="20px"
                    borderRadius="m"
                    isLoading={loadingDataStreamStats || loadingDocStats}
                  >
                    {formatNumber(
                      DataStreamStat.calculateFilteredSize(dataStreamStat),
                      BYTE_NUMBER_FORMAT
                    )}
                  </EuiSkeletonRectangle>
                </PrivilegesWarningIconWrapper>
              );
            },
            width: '100px',
          },
        ]
      : []),
    {
      name: (
        <EuiTableHeader data-test-subj="datasetQualityQualityColumn">
          <EuiToolTip content={datasetQualityColumnTooltip}>
            <span>
              {`${datasetQualityColumnName} `}
              <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
            </span>
          </EuiToolTip>
        </EuiTableHeader>
      ),
      field: 'quality',
      sortable: true,
      render: (_, dataStreamStat: DataStreamStat) => (
        <DatasetQualityIndicator
          isLoading={loadingDegradedStats || loadingFailedStats || loadingDocStats}
          quality={dataStreamStat.quality}
        />
      ),
      width: '140px',
    },
    {
      name: (
        <EuiTableHeader data-test-subj="datasetQualityPercentageColumn">
          <EuiToolTip content={degradedDocsColumnTooltip}>
            <span>
              {`${degradedDocsColumnName} `}
              <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
            </span>
          </EuiToolTip>
        </EuiTableHeader>
      ),
      field: 'degradedDocs.percentage',
      sortable: true,
      render: (_, dataStreamStat: DataStreamStat) => (
        <QualityStatPercentageLink
          isLoading={loadingDegradedStats}
          dataStreamStat={dataStreamStat}
          timeRange={timeRange}
          accessor="degradedDocs"
          query={{ language: 'kuery', query: DEGRADED_DOCS_QUERY }}
          fewDocStatsTooltip={(degradedDocsCount: number) =>
            i18n.translate('xpack.datasetQuality.fewDegradedDocsTooltip', {
              defaultMessage: '{degradedDocsCount} degraded docs in this data set.',
              values: {
                degradedDocsCount,
              },
            })
          }
          dataTestSubj="datasetQualityDegradedDocsPercentageLink"
        />
      ),
      width: '140px',
    },
    ...(isFailureStoreEnabled
      ? [
          {
            name: (
              <EuiTableHeader data-test-subj="datasetQualityFailedPercentageColumn">
                <EuiToolTip content={failedDocsColumnTooltip}>
                  <span>
                    {`${failedDocsColumnName} `}
                    <EuiIcon
                      size="s"
                      color="subdued"
                      type="questionInCircle"
                      className="eui-alignTop"
                    />
                  </span>
                </EuiToolTip>
              </EuiTableHeader>
            ),
            field: 'failedDocs.percentage',
            sortable: true,
            render: (_: any, dataStreamStat: DataStreamStat) => (
              <QualityStatPercentageLink
                isLoading={loadingFailedStats}
                dataStreamStat={dataStreamStat}
                timeRange={timeRange}
                accessor="failedDocs"
                selector={FAILURE_STORE_SELECTOR}
                fewDocStatsTooltip={(failedDocsCount: number) =>
                  i18n.translate('xpack.datasetQuality.fewFailedDocsTooltip', {
                    defaultMessage: '{failedDocsCount} failed docs in this data set.',
                    values: {
                      failedDocsCount,
                    },
                  })
                }
                dataTestSubj="datasetQualityFailedDocsPercentageLink"
              />
            ),
            width: '140px',
          },
        ]
      : []),
    ...(canUserMonitorDataset && canUserMonitorAnyDataStream
      ? [
          {
            name: (
              <EuiTableHeader data-test-subj="datasetQualityLastActivityColumn">
                {lastActivityColumnName}
              </EuiTableHeader>
            ),
            field: 'lastActivity',
            render: (timestamp: number) => (
              <EuiSkeletonRectangle
                width="200px"
                height="20px"
                borderRadius="m"
                isLoading={loadingDataStreamStats}
              >
                {!isActiveDataset(timestamp) ? (
                  <EuiFlexGroup gutterSize="xs" alignItems="center">
                    <EuiText size="s">{inactiveDatasetActivityColumnDescription}</EuiText>
                    <EuiToolTip position="top" content={inactiveDatasetActivityColumnTooltip}>
                      <EuiIcon tabIndex={0} type="iInCircle" size="s" />
                    </EuiToolTip>
                  </EuiFlexGroup>
                ) : (
                  fieldFormats
                    .getDefaultInstance(KBN_FIELD_TYPES.DATE, [ES_FIELD_TYPES.DATE])
                    .convert(timestamp)
                )}
              </EuiSkeletonRectangle>
            ),
            width: '300px',
            sortable: true,
          },
        ]
      : []),
    {
      name: actionsColumnName,
      render: (dataStreamStat: DataStreamStat) => (
        <RedirectLink
          dataStreamStat={dataStreamStat}
          title={openActionName}
          timeRange={timeRange}
        />
      ),
      width: '100px',
    },
  ];
};

const RedirectLink = ({
  dataStreamStat,
  title,
  timeRange,
}: {
  dataStreamStat: DataStreamStat;
  title: string;
  timeRange: TimeRangeConfig;
}) => {
  const { sendTelemetry } = useDatasetRedirectLinkTelemetry({ rawName: dataStreamStat.rawName });
  const redirectLinkProps = useRedirectLink({
    dataStreamStat,
    sendTelemetry,
    timeRangeConfig: timeRange,
  });

  return (
    <EuiLink data-test-subj="datasetQualityLogsExplorerLinkLink" {...redirectLinkProps.linkProps}>
      {title}
    </EuiLink>
  );
};
