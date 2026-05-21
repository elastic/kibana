/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IngestHubDemoStreamTopology } from '../ingest_hub_demo_stream_topology';
import {
  AWS_LOGS_DEMO_DATA_SOURCES,
  type AwsLogsDemoDataSource,
  type AwsLogsDemoDataSourceCategory,
} from '../ingest_hub_aws_logs_demo_data';
import { inferFlowCanvasDataProduct } from './ingest_hub_demo_streams_flow_card_badge_row';
import type { FlowCanvasCardSelection } from './ingest_hub_demo_streams_flow_card_selection';

function formatEps(docsPerSec: number): string {
  if (docsPerSec >= 1000) {
    return `${(docsPerSec / 1000).toFixed(1)}k`;
  }
  return String(docsPerSec);
}

function categoryLabel(category: AwsLogsDemoDataSourceCategory): string {
  switch (category) {
    case 'integration':
      return i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.categoryIntegration', {
        defaultMessage: 'Integration',
      });
    case 'input_package':
      return i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.categoryInputPackage', {
        defaultMessage: 'Input package',
      });
    case 'asset':
      return i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.categoryAsset', {
        defaultMessage: 'Asset',
      });
    case 'connector':
      return i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.categoryConnector', {
        defaultMessage: 'Connector',
      });
    case 'api':
      return i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.categoryApi', {
        defaultMessage: 'API',
      });
    case 'custom':
      return i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.categoryCustom', {
        defaultMessage: 'Custom',
      });
  }
}

function statusLabel(status: AwsLogsDemoDataSource['status']): string {
  switch (status) {
    case 'active':
      return i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.statusActive', {
        defaultMessage: 'Active',
      });
    case 'delayed':
      return i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.statusDelayed', {
        defaultMessage: 'Delayed',
      });
    case 'stale':
      return i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.statusStale', {
        defaultMessage: 'Stale',
      });
  }
}

function qualityLabel(quality: 'good' | 'degraded' | 'poor'): string {
  switch (quality) {
    case 'good':
      return i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.qualityGood', {
        defaultMessage: 'Good',
      });
    case 'degraded':
      return i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.qualityDegraded', {
        defaultMessage: 'Degraded',
      });
    case 'poor':
      return i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.qualityPoor', {
        defaultMessage: 'Poor',
      });
  }
}

function qualityBadgeColor(
  quality: 'good' | 'degraded' | 'poor'
): 'success' | 'warning' | 'danger' {
  if (quality === 'poor') {
    return 'danger';
  }
  if (quality === 'degraded') {
    return 'warning';
  }
  return 'success';
}

interface FlyoutContent {
  readonly title: string;
  readonly description: string;
  readonly listItems: Array<{ title: string; description: string }>;
  readonly codeBlockLabel?: string;
  readonly codeBlock?: string;
  readonly qualityBadge?: 'good' | 'degraded' | 'poor';
  readonly footerAction?: { readonly label: string; readonly onClick: () => void };
}

export interface IngestHubDemoStreamsFlowCardDetailFlyoutProps {
  readonly selection: FlowCanvasCardSelection;
  readonly topology: IngestHubDemoStreamTopology;
  readonly flyoutTitleId: string;
  readonly onClose: () => void;
  readonly onStreamNavigate: (streamName: string) => void;
}

export function IngestHubDemoStreamsFlowCardDetailFlyout({
  selection,
  topology,
  flyoutTitleId,
  onClose,
  onStreamNavigate,
}: IngestHubDemoStreamsFlowCardDetailFlyoutProps) {
  const flowIndex = selection.flowIndex;
  const source = topology.sources[flowIndex];
  const destination =
    topology.destinations.find((dest) => dest.id === source?.id) ??
    topology.destinations[flowIndex];

  const content = useMemo((): FlyoutContent | null => {
    const wiredStreamLabel = i18n.translate(
      'xpack.streams.ingestHubFlowCanvas.flyout.wiredStream',
      {
        defaultMessage: 'Wired stream',
      }
    );
    const wiredStreamValue = topology.displayTitle;

    if (selection.kind === 'source' && source) {
      const dataSource = AWS_LOGS_DEMO_DATA_SOURCES.find((entry) => entry.id === source.id);
      const items = [
        { title: wiredStreamLabel, description: wiredStreamValue },
        {
          title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.throughput', {
            defaultMessage: 'Throughput',
          }),
          description: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.throughputValue', {
            defaultMessage: '{eps} events per second · ~180ms ingest latency',
            values: { eps: formatEps(source.docsPerSec) },
          }),
        },
        {
          title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.dataProduct', {
            defaultMessage: 'Data product',
          }),
          description:
            inferFlowCanvasDataProduct(destination?.name ?? source.id) === 'logs'
              ? i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.dataProductLogs', {
                  defaultMessage: 'Logs',
                })
              : i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.dataProductMetrics', {
                  defaultMessage: 'Metrics',
                }),
        },
      ];

      if (dataSource) {
        items.push(
          {
            title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.category', {
              defaultMessage: 'Category',
            }),
            description: categoryLabel(dataSource.category),
          },
          {
            title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.status', {
              defaultMessage: 'Status',
            }),
            description: statusLabel(dataSource.status),
          },
          {
            title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.lastSeen', {
              defaultMessage: 'Last seen',
            }),
            description: dataSource.lastSeen,
          },
          {
            title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.scope', {
              defaultMessage: 'Scope',
            }),
            description: dataSource.detail,
          }
        );
        if (dataSource.dashboards != null) {
          items.push({
            title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.dashboards', {
              defaultMessage: 'Dashboards',
            }),
            description: String(dataSource.dashboards),
          });
        }
        if (dataSource.rules != null) {
          items.push({
            title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.rules', {
              defaultMessage: 'Detection rules',
            }),
            description: String(dataSource.rules),
          });
        }
      }

      if (destination) {
        items.push({
          title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.destinationStream', {
            defaultMessage: 'Destination stream',
          }),
          description: destination.name,
        });
      }

      return {
        title: source.title,
        description: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.sourceDescription', {
          defaultMessage:
            'Data source that sends logs into the shared AWS pipeline before routing to a destination stream.',
        }),
        listItems: items,
      };
    }

    if (selection.kind === 'processing' && selection.processingStepId) {
      const step = topology.processingSteps.find(
        (entry) => entry.id === selection.processingStepId
      );
      if (!step) {
        return null;
      }

      return {
        title: step.label,
        description: i18n.translate(
          'xpack.streams.ingestHubFlowCanvas.flyout.processingDescription',
          {
            defaultMessage:
              'Processing step in the shared Streamlang pipeline. Applied to every AWS source in this wired stream.',
          }
        ),
        listItems: [
          { title: wiredStreamLabel, description: wiredStreamValue },
          {
            title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.stepType', {
              defaultMessage: 'Step type',
            }),
            description: i18n.translate(
              'xpack.streams.ingestHubFlowCanvas.flyout.stepTypePipeline',
              {
                defaultMessage: 'Pipeline',
              }
            ),
          },
          ...(source
            ? [
                {
                  title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.exampleSource', {
                    defaultMessage: 'Example source in this flow',
                  }),
                  description: source.title,
                },
              ]
            : []),
        ],
        codeBlockLabel: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.streamlang', {
          defaultMessage: 'Streamlang',
        }),
        codeBlock: step.streamlangSummary,
      };
    }

    if (selection.kind === 'routing' && source && destination) {
      const condition = `event.dataset == aws.${source.id}`;
      return {
        title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.routingTitle', {
          defaultMessage: 'Route to destination',
        }),
        description: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.routingDescription', {
          defaultMessage:
            'Routing rule that sends events from this source to its destination stream after processing.',
        }),
        listItems: [
          { title: wiredStreamLabel, description: wiredStreamValue },
          {
            title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.source', {
              defaultMessage: 'Source',
            }),
            description: source.title,
          },
          {
            title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.condition', {
              defaultMessage: 'Condition',
            }),
            description: condition,
          },
          {
            title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.destinationStream', {
              defaultMessage: 'Destination stream',
            }),
            description: destination.name,
          },
        ],
        codeBlockLabel: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.routingRule', {
          defaultMessage: 'Routing rule',
        }),
        codeBlock: condition,
        footerAction: {
          label: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.openDestination', {
            defaultMessage: 'Open destination stream',
          }),
          onClick: () => onStreamNavigate(destination.name),
        },
      };
    }

    if (selection.kind === 'stream' && destination) {
      return {
        title: destination.name,
        description: i18n.translate(
          'xpack.streams.ingestHubFlowCanvas.flyout.destinationDescription',
          {
            defaultMessage:
              'Destination stream that stores processed logs for this AWS integration.',
          }
        ),
        listItems: [
          { title: wiredStreamLabel, description: wiredStreamValue },
          ...(source
            ? [
                {
                  title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.source', {
                    defaultMessage: 'Source',
                  }),
                  description: source.title,
                },
              ]
            : []),
          {
            title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.throughput', {
              defaultMessage: 'Throughput',
            }),
            description: i18n.translate(
              'xpack.streams.ingestHubFlowCanvas.flyout.throughputRetention',
              {
                defaultMessage: '30d retention · {eps} events per second · ~180ms ingest latency',
                values: { eps: formatEps(destination.docsPerSec) },
              }
            ),
          },
          {
            title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.dataQuality', {
              defaultMessage: 'Data quality',
            }),
            description: qualityLabel(destination.quality),
          },
          {
            title: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.dataProduct', {
              defaultMessage: 'Data product',
            }),
            description:
              inferFlowCanvasDataProduct(destination.name) === 'logs'
                ? i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.dataProductLogs', {
                    defaultMessage: 'Logs',
                  })
                : i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.dataProductMetrics', {
                    defaultMessage: 'Metrics',
                  }),
          },
        ],
        qualityBadge: destination.quality,
        footerAction: {
          label: i18n.translate('xpack.streams.ingestHubFlowCanvas.flyout.openStream', {
            defaultMessage: 'Open stream',
          }),
          onClick: () => onStreamNavigate(destination.name),
        },
      };
    }

    return null;
  }, [
    destination,
    onStreamNavigate,
    selection,
    source,
    topology.displayTitle,
    topology.processingSteps,
  ]);

  if (!content) {
    return null;
  }

  return (
    <EuiFlyout
      ownFocus
      size="s"
      maxWidth={480}
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      data-test-subj="streamsFlowCanvasCardDetailFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{content.title}</h2>
        </EuiTitle>
        {content.qualityBadge ? (
          <>
            <EuiSpacer size="s" />
            <EuiBadge color={qualityBadgeColor(content.qualityBadge)}>
              {qualityLabel(content.qualityBadge)}
            </EuiBadge>
          </>
        ) : null}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s" color="subdued">
          <p>{content.description}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiDescriptionList listItems={content.listItems} />
        {content.codeBlock ? (
          <>
            <EuiSpacer size="m" />
            <EuiText size="xs">
              <strong>{content.codeBlockLabel}</strong>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="text" fontSize="s" paddingSize="m" isCopyable>
              {content.codeBlock}
            </EuiCodeBlock>
          </>
        ) : null}
      </EuiFlyoutBody>
      {content.footerAction ? (
        <EuiFlyoutFooter>
          <EuiButton
            fill
            onClick={content.footerAction.onClick}
            data-test-subj="streamsFlowCanvasCardFlyoutPrimary"
          >
            {content.footerAction.label}
          </EuiButton>
        </EuiFlyoutFooter>
      ) : null}
    </EuiFlyout>
  );
}
