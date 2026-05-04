/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FlowNode } from '@kbn/streams-plugin/common';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { formatRate } from '../edges/throughput_edge';

type ClassicStreamNode = Extract<FlowNode, { kind: 'classicStream' }>;

interface PanelClassicStreamProps {
  node: ClassicStreamNode;
  onClose: () => void;
}

export const PanelClassicStream: React.FC<PanelClassicStreamProps> = ({ node }) => {
  const router = useStreamsAppRouter();
  const { streamName } = node;
  const hasFailures = (node.failureRate?.docsPerSec ?? 0) > 0;

  const managementLink = (tab: string) =>
    router.link('/{key}/management/{tab}', {
      path: { key: streamName, tab },
    });

  const listItems = [
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelClassicStream.streamName', {
        defaultMessage: 'Stream name',
      }),
      description: streamName,
    },
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelClassicStream.dataStream', {
        defaultMessage: 'Data stream',
      }),
      description: node.dataStream,
    },
    {
      title: i18n.translate('xpack.streams.ingestFlow.panelClassicStream.throughput', {
        defaultMessage: 'Throughput',
      }),
      description: node.throughput ? formatRate(node.throughput.docsPerSec) : '—',
    },
  ];

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {streamName}{' '}
            <EuiBadge color="hollow">
              {i18n.translate('xpack.streams.ingestFlow.panelClassicStream.classicBadge', {
                defaultMessage: 'CLASSIC',
              })}
            </EuiBadge>
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiDescriptionList listItems={listItems} type="column" columnWidths={[1, 2]} />
        {hasFailures && node.failureRate ? (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              color="danger"
              iconType="warning"
              title={i18n.translate(
                'xpack.streams.ingestFlow.panelClassicStream.failureCalloutTitle',
                {
                  defaultMessage: '{rate} docs/sec failing ingest',
                  values: { rate: formatRate(node.failureRate.docsPerSec) },
                }
              )}
            />
          </>
        ) : null}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup gutterSize="s" wrap responsive={false} justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" href={managementLink('processing')} iconType="indexSettings">
              {i18n.translate('xpack.streams.ingestFlow.panelClassicStream.processingButton', {
                defaultMessage: 'Processing',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" href={managementLink('schema')} iconType="list">
              {i18n.translate('xpack.streams.ingestFlow.panelClassicStream.schemaButton', {
                defaultMessage: 'Schema',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" href={managementLink('retention')} iconType="clock">
              {i18n.translate('xpack.streams.ingestFlow.panelClassicStream.retentionButton', {
                defaultMessage: 'Retention',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" href={managementLink('attachments')} iconType="dashboardApp">
              {i18n.translate('xpack.streams.ingestFlow.panelClassicStream.dashboardsButton', {
                defaultMessage: 'Dashboards',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="discoverApp"
              onClick={() => {
                // TODO: use useStreamDiscoverLink (workstream E)
              }}
            >
              {i18n.translate('xpack.streams.ingestFlow.panelClassicStream.viewInDiscoverButton', {
                defaultMessage: 'View in Discover',
              })}
            </EuiButton>
          </EuiFlexItem>
          {hasFailures ? (
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color="danger"
                iconType="discoverApp"
                onClick={() => {
                  // TODO: use useFailureStoreRedirectLink (workstream E)
                }}
              >
                {i18n.translate(
                  'xpack.streams.ingestFlow.panelClassicStream.viewFailuresInDiscoverButton',
                  {
                    defaultMessage: 'View failures in Discover',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
