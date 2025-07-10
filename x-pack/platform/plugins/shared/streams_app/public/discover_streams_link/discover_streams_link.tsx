/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataTableRecord } from '@kbn/discover-utils';
import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { EuiFlexGroup, EuiTitle, EuiBetaBadge, EuiLoadingSpinner, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { CoreStart } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { useAbortableAsync } from '@kbn/react-hooks';
import { StreamsAppLocator } from '../app_locator';

export interface DiscoverStreamsLinkProps {
  doc: DataTableRecord;
  streamsRepositoryClient: StreamsRepositoryClient;
  coreApplication: CoreStart['application'];
  locator: StreamsAppLocator;
}

export function DiscoverStreamsLink(props: DiscoverStreamsLinkProps) {
  return (
    <RedirectAppLinks coreStart={{ application: props.coreApplication }}>
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
          <EuiTitle size="xxxs">
            <span>
              {i18n.translate('xpack.streams.discoverStreamsLink.title', {
                defaultMessage: 'Stream',
              })}
            </span>
          </EuiTitle>
          <EuiBetaBadge
            size="s"
            label={i18n.translate('xpack.streams.betaBadgeLabel', {
              defaultMessage: 'Streams is currently in tech preview',
            })}
            color="hollow"
            iconType="beaker"
          />
        </EuiFlexGroup>
        <EuiFlexGroup
          responsive={false}
          alignItems="center"
          justifyContent="flexStart"
          gutterSize="xs"
        >
          <DiscoverStreamsLinkContent {...props} />
        </EuiFlexGroup>
      </EuiFlexGroup>
    </RedirectAppLinks>
  );
}

function getFallbackStreamName(flattenedDoc: Record<string, unknown>) {
  const wiredStreamName = flattenedDoc['stream.name'];
  if (wiredStreamName) {
    return String(wiredStreamName);
  }
  const dsnsType = flattenedDoc['data_stream.type'];
  const dsnsDataset = flattenedDoc['data_stream.dataset'];
  const dsnsNamespace = flattenedDoc['data_stream.namespace'];
  if (dsnsType && dsnsDataset && dsnsNamespace) {
    return `${dsnsType}-${dsnsDataset}-${dsnsNamespace}`;
  }
  return undefined;
}

function DiscoverStreamsLinkContent({
  streamsRepositoryClient,
  doc,
  locator,
}: DiscoverStreamsLinkProps) {
  const flattenedDoc = doc.flattened;
  const index = doc.raw._index;
  const fallbackStreamName = getFallbackStreamName(flattenedDoc);
  const { value, loading, error } = useAbortableAsync(
    async ({ signal }) => {
      if (!index) {
        return fallbackStreamName;
      }
      const definition = await streamsRepositoryClient.fetch(
        'GET /internal/streams/_resolve_index',
        {
          signal,
          params: {
            query: {
              index,
            },
          },
        }
      );
      return definition?.stream?.name;
    },
    [streamsRepositoryClient, index, fallbackStreamName]
  );
  const params = useMemo(() => ({ name: value }), [value]);
  const redirectUrl = useMemo(() => locator.getRedirectUrl(params), [locator, params]);
  const empty = <span>-</span>;
  if (!index && !value) {
    return empty;
  }
  if (loading) {
    return <EuiLoadingSpinner size="s" />;
  }
  if (error || !value) {
    return empty;
  }

  return <EuiLink href={redirectUrl}>{value}</EuiLink>;
}
