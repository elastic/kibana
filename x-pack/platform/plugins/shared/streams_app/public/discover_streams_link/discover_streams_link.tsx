/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataTableRecord } from '@kbn/discover-utils';
import { StreamsPluginStart } from '@kbn/streams-plugin/public';
import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { EuiFlexGroup, EuiTitle, EuiBetaBadge, EuiLoadingSpinner, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import React, { useMemo } from 'react';
import { CoreStart } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { useStreamsAppFetch } from '../hooks/use_streams_app_fetch';
import { StreamsAppLocator } from '../app_locator';

export interface DiscoverStreamsLinkProps {
  doc: DataTableRecord;
  streamStatus$: StreamsPluginStart['status$'];
  streamsRepositoryClient: StreamsRepositoryClient;
  coreApplication: CoreStart['application'];
  locator: StreamsAppLocator;
}

function DiscoverStreamsLink(props: DiscoverStreamsLinkProps) {
  const { streamStatus$ } = props;
  const streamStatus = useObservable(streamStatus$);
  if (streamStatus?.status !== 'enabled') {
    return null;
  }
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

function DiscoverStreamsLinkContent({
  streamsRepositoryClient,
  doc,
  locator,
}: DiscoverStreamsLinkProps) {
  const index = doc.raw._index;
  const { value, loading, error } = useStreamsAppFetch(
    ({ signal }) => {
      if (!index) {
        return;
      }
      return streamsRepositoryClient.fetch('GET /api/streams/_resolve_index', {
        signal,
        params: {
          query: {
            index,
          },
        },
      });
    },
    [streamsRepositoryClient, index],
    { disableToastOnError: true }
  );
  const params = useMemo(() => ({ name: value?.stream?.name }), [value]);
  const redirectUrl = useMemo(() => locator.getRedirectUrl(params), [locator, params]);
  const empty = <span>-</span>;
  if (!index) {
    return empty;
  }
  if (loading) {
    return <EuiLoadingSpinner size="s" />;
  }
  if (error || !value?.stream) {
    return empty;
  }

  return <EuiLink href={redirectUrl}>{value.stream.name}</EuiLink>;
}

// eslint-disable-next-line import/no-default-export
export default DiscoverStreamsLink;
