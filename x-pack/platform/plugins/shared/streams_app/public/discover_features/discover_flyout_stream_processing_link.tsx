/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataTableRecord } from '@kbn/discover-utils';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { EuiLoadingSpinner, EuiLink, EuiFlexGroup, EuiToolTip, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { CUSTOM_SAMPLES_DATA_SOURCE_STORAGE_KEY_PREFIX } from '../../common/url_schema/common';
import type { StreamsAppLocator, StreamsAppLocatorParams } from '../../common/locators';
import { useResolvedDefinitionName } from './use_resolved_definition_name';

export interface DiscoverFlyoutStreamProcessingLinkProps {
  dataView: DataView;
  doc: DataTableRecord;
  fieldFormats: FieldFormatsStart;
  locator: StreamsAppLocator;
  streamsRepositoryClient: StreamsRepositoryClient;
}

export function DiscoverFlyoutStreamProcessingLink({
  doc,
  locator,
  streamsRepositoryClient,
}: DiscoverFlyoutStreamProcessingLinkProps) {
  const { value, loading, error } = useResolvedDefinitionName({
    streamsRepositoryClient,
    doc,
  });

  if (loading) return <EuiLoadingSpinner size="s" />;

  if (!value || error) return null;

  const href = locator.getRedirectUrl({
    name: value,
    managementTab: 'processing',
    pageState: {
      v: 1,
      dataSources: [getTargetDataSource(doc, value)],
    },
  } as StreamsAppLocatorParams);

  const message = i18n.translate('xpack.streams.discoverFlyoutStreamProcessingLink', {
    defaultMessage: 'Parse content in Streams',
  });

  return (
    <EuiLink href={href}>
      <EuiToolTip content={message} display="block">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiText size="xs" className="eui-textTruncate">
            {message}
          </EuiText>
        </EuiFlexGroup>
      </EuiToolTip>
    </EuiLink>
  );
}

const getTargetDataSource = (doc: DataTableRecord, streamName: string) => {
  const baseDataSource = {
    enabled: true,
    name: i18n.translate('xpack.streams.discoverFlyoutStreamProcessingLink.customSamplesName', {
      defaultMessage: 'Discover document from {streamName}',
      values: { streamName },
    }),
  };

  if (doc.raw._id) {
    return {
      ...baseDataSource,
      type: 'kql-samples',
      query: {
        language: 'kuery',
        query: `_id: ${doc.raw._id}`,
      },
    };
  }

  return {
    ...baseDataSource,
    type: 'custom-samples',
    documents: [doc.flattened],
    storageKey: `${CUSTOM_SAMPLES_DATA_SOURCE_STORAGE_KEY_PREFIX}${streamName}__discover-document`,
  };
};
