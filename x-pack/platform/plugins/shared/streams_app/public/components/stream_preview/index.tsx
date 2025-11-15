/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import React, { useMemo } from 'react';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { useTimefilter } from '../../hooks/use_timefilter';
import { ConditionPanel } from '../data_management/shared';
import {
  formatBytes,
  formatIngestionRate,
} from '../data_management/stream_detail_lifecycle/helpers/format_bytes';
import { useDataStreamStats } from '../data_management/stream_detail_lifecycle/hooks/use_data_stream_stats';
import type { EnrichedStream } from '../stream_list_view/utils';

interface StreamPreviewProps {
  current: EnrichedStream;
  parent?: ListStreamDetail;
  onViewArchitecture: () => void;
}

export const StreamPreview = ({ current, parent, onViewArchitecture }: StreamPreviewProps) => {
  const { euiTheme } = useEuiTheme();
  const parentRoutingConditions =
    parent && Streams.WiredStream.Definition.is(parent.stream)
      ? parent.stream.ingest.wired.routing
      : undefined;
  const currentRoutingCondition = parentRoutingConditions?.find(
    (cond) => cond.destination === current.stream.name && cond.status === 'enabled'
  )?.where;
  const isWiredStream = Streams.WiredStream.Definition.is(current.stream);

  const title = css`
    font-weight: ${euiTheme.font.weight.bold};
    font-size: ${euiTheme.font.scale.xs}rem;
    color: ${euiTheme.colors.textHeading};
  `;

  const principalTitle = `${title} ${css`
    color: ${euiTheme.colors.textHeading};
  `}`;

  const subTitle = `${title} ${css`
    color: ${euiTheme.colors.textSubdued};
  `}`;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      className={css`
        min-width: 250px;
      `}
    >
      <EuiText className={principalTitle}>
        {i18n.translate('xpack.streamsApp.streamPreview.title', {
          defaultMessage: 'Stream Preview',
        })}
      </EuiText>
      <EuiFlexGroup
        gutterSize="s"
        justifyContent="spaceBetween"
        className={css`
          > div {
            width: 50%;
          }
        `}
      >
        <Stat stream={current} className={subTitle} type="ingestionRate" />
        <Stat stream={current} className={subTitle} type="storageSize" />
      </EuiFlexGroup>
      {currentRoutingCondition && (
        <>
          <ConditionPanel
            condition={currentRoutingCondition}
            className={css`
              margin: ${euiTheme.size.s} 0;
              div * {
                font-size: ${euiTheme.font.scale.xxs}rem;
              }
            `}
          />
        </>
      )}
      {isWiredStream && (
        <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
          <EuiText className={subTitle}>
            {i18n.translate('xpack.streamsApp.streamPreview.viewArchitectureTitle', {
              defaultMessage: 'Architecture Viewer',
            })}
          </EuiText>
          <EuiButtonIcon
            iconType="expand"
            display="base"
            color="text"
            aria-label={i18n.translate('xpack.streamsApp.streamPreview.viewArchitectureLabel', {
              defaultMessage: 'View architecture',
            })}
            onClick={onViewArchitecture}
          />
        </EuiFlexGroup>
      )}
    </EuiFlexGroup>
  );
};

const Stat = ({
  stream,
  className,
  type,
}: {
  stream: EnrichedStream;
  className?: string;
  type: 'ingestionRate' | 'storageSize';
}) => {
  const { euiTheme } = useEuiTheme();
  const { timeState } = useTimefilter();
  const definition = useMemo(() => {
    return {
      stream: stream.stream,
      data_stream_exists: !!stream.data_stream,
    } as Streams.ingest.all.GetResponse;
  }, [stream]);

  const { stats, isLoading } = useDataStreamStats({
    definition,
    timeState,
  });

  const stat = css`
    font-size: ${euiTheme.font.scale.xs}rem;
  `;

  const label =
    type === 'ingestionRate'
      ? i18n.translate('xpack.streamsApp.streamPreview.ingestionRateLabel', {
          defaultMessage: 'Ingestion rate',
        })
      : i18n.translate('xpack.streamsApp.streamPreview.storageSizeLabel', {
          defaultMessage: 'Storage size',
        });

  const value = isLoading
    ? '-'
    : type === 'ingestionRate'
    ? stats?.ds.stats.bytesPerDay
      ? formatIngestionRate(stats.ds.stats.bytesPerDay || 0, true)
      : '-'
    : stats?.ds.stats.sizeBytes
    ? formatBytes(stats.ds.stats.sizeBytes)
    : '-';

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiText className={className}>{label}</EuiText>
      <EuiFlexItem className={stat} grow={false}>
        <EuiSkeletonText
          size="xs"
          lines={1}
          isLoading={isLoading}
          className={css`
            span {
              inline-size: ${euiTheme.size.xxxl};
            }
          `}
          contentAriaLabel={i18n.translate('xpack.streamsApp.streamPreview.statLoadingLabel', {
            defaultMessage: 'Loading value',
          })}
        >
          {value}
        </EuiSkeletonText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
