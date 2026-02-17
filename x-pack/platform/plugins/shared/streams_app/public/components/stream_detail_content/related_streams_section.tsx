/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiBadge,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Relationship } from '@kbn/streams-schema';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useTimeRange } from '../../hooks/use_time_range';

interface RelatedStreamsSectionProps {
  relationships: Relationship[];
  loading: boolean;
  streamName: string;
  canManage: boolean;
  onUnlink: (targetStream: string) => Promise<void>;
  onRefresh: () => void;
}

export function RelatedStreamsSection({
  relationships,
  loading,
  streamName,
  canManage,
  onUnlink,
  onRefresh,
}: RelatedStreamsSectionProps) {
  const router = useStreamsAppRouter();
  const { euiTheme } = useEuiTheme();
  const { rangeFrom, rangeTo } = useTimeRange();

  const columns: Array<EuiBasicTableColumn<Relationship>> = [
    {
      field: 'to_stream',
      name: i18n.translate('xpack.streams.content.relatedStreams.streamColumn', {
        defaultMessage: 'Stream',
      }),
      render: (toStream: string, relationship: Relationship) => {
        const relatedStream =
          relationship.from_stream === streamName
            ? relationship.to_stream
            : relationship.from_stream;

        return (
          <EuiLink
            href={router.link('/{key}/management/{tab}', {
              path: { key: relatedStream, tab: 'retention' },
              query: { rangeFrom, rangeTo },
            })}
          >
            {relatedStream}
          </EuiLink>
        );
      },
    },
    {
      field: 'direction',
      name: i18n.translate('xpack.streams.content.relatedStreams.directionColumn', {
        defaultMessage: 'Direction',
      }),
      width: '120px',
      render: (direction: string) => (
        <EuiBadge color={direction === 'bidirectional' ? 'primary' : 'hollow'}>
          {direction === 'bidirectional' ? BIDIRECTIONAL_LABEL : DIRECTIONAL_LABEL}
        </EuiBadge>
      ),
    },
    {
      field: 'source',
      name: i18n.translate('xpack.streams.content.relatedStreams.sourceColumn', {
        defaultMessage: 'Source',
      }),
      width: '130px',
      render: (source: string, relationship: Relationship) => (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color={source === 'auto_detected' ? 'success' : 'hollow'}>
              {source === 'auto_detected' ? AUTO_DETECTED_LABEL : MANUAL_LABEL}
            </EuiBadge>
          </EuiFlexItem>
          {relationship.confidence !== undefined && (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={CONFIDENCE_TOOLTIP}>
                <EuiText size="xs" color="subdued">
                  {Math.round(relationship.confidence * 100)}%
                </EuiText>
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'description',
      name: i18n.translate('xpack.streams.content.relatedStreams.descriptionColumn', {
        defaultMessage: 'Description',
      }),
      truncateText: true,
    },
    {
      name: i18n.translate('xpack.streams.content.relatedStreams.actionsColumn', {
        defaultMessage: 'Actions',
      }),
      width: '80px',
      actions: [
        {
          name: i18n.translate('xpack.streams.content.relatedStreams.unlinkAction', {
            defaultMessage: 'Remove relationship',
          }),
          description: i18n.translate(
            'xpack.streams.content.relatedStreams.unlinkActionDescription',
            {
              defaultMessage: 'Remove this relationship',
            }
          ),
          type: 'icon',
          icon: 'unlink',
          enabled: () => canManage,
          onClick: (relationship) => {
            const relatedStream =
              relationship.from_stream === streamName
                ? relationship.to_stream
                : relationship.from_stream;
            onUnlink(relatedStream);
          },
          'data-test-subj': 'streamsAppRelatedStreamUnlinkAction',
        },
      ],
    },
  ];

  if (loading) {
    return (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} title={<span />} />
      </EuiPanel>
    );
  }

  if (relationships.length === 0) {
    return (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        <EuiEmptyPrompt
          iconType="link"
          title={<h3>{NO_RELATIONSHIPS_TITLE}</h3>}
          body={<p>{NO_RELATIONSHIPS_DESCRIPTION}</p>}
        />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="refresh"
            aria-label={i18n.translate('xpack.streams.content.relatedStreams.refreshButton', {
              defaultMessage: 'Refresh relationships',
            })}
            onClick={onRefresh}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiBasicTable
        css={css`
          & thead tr {
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
          }
        `}
        tableCaption={i18n.translate('xpack.streams.content.relatedStreams.tableCaption', {
          defaultMessage: 'List of related streams',
        })}
        data-test-subj="streamsAppRelatedStreamsTable"
        columns={columns}
        itemId={(item) => `${item.from_stream}-${item.to_stream}`}
        items={relationships}
      />
    </EuiPanel>
  );
}

// i18n labels

const BIDIRECTIONAL_LABEL = i18n.translate(
  'xpack.streams.content.relatedStreams.bidirectionalLabel',
  {
    defaultMessage: 'Bidirectional',
  }
);

const DIRECTIONAL_LABEL = i18n.translate('xpack.streams.content.relatedStreams.directionalLabel', {
  defaultMessage: 'Directional',
});

const AUTO_DETECTED_LABEL = i18n.translate(
  'xpack.streams.content.relatedStreams.autoDetectedLabel',
  {
    defaultMessage: 'Auto-detected',
  }
);

const MANUAL_LABEL = i18n.translate('xpack.streams.content.relatedStreams.manualLabel', {
  defaultMessage: 'Manual',
});

const CONFIDENCE_TOOLTIP = i18n.translate(
  'xpack.streams.content.relatedStreams.confidenceTooltip',
  {
    defaultMessage: 'Confidence score for auto-detected relationships',
  }
);

const NO_RELATIONSHIPS_TITLE = i18n.translate(
  'xpack.streams.content.relatedStreams.empty.title',
  {
    defaultMessage: 'No related streams',
  }
);

const NO_RELATIONSHIPS_DESCRIPTION = i18n.translate(
  'xpack.streams.content.relatedStreams.empty.description',
  {
    defaultMessage:
      'Relationships connect streams that share data across different hierarchies, like application logs and proxy logs for the same service.',
  }
);
