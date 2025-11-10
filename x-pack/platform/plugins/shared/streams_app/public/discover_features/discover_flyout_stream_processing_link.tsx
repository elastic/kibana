/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataTableRecord } from '@kbn/discover-utils';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import {
  EuiLoadingSpinner,
  EuiLink,
  EuiIcon,
  EuiFlexGroup,
  EuiToolTip,
  useEuiTheme,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { css } from '@emotion/react';
import { getFormattedFields } from '@kbn/discover-utils/src/utils/get_formatted_fields';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { isMetadataField } from '@kbn/fields-metadata-plugin/common';
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
  dataView,
  doc,
  fieldFormats,
  locator,
  streamsRepositoryClient,
}: DiscoverFlyoutStreamProcessingLinkProps) {
  const { euiTheme } = useEuiTheme();
  const { value, loading, error } = useResolvedDefinitionName({
    streamsRepositoryClient,
    doc,
  });

  if (loading) return <EuiLoadingSpinner size="s" />;

  if (!value || error) return null;

  const formattedDoc = formatDoc(doc, dataView, fieldFormats);

  const href = locator.getRedirectUrl({
    name: value,
    managementTab: 'processing',
    pageState: {
      v: 1,
      dataSources: [
        {
          type: 'custom-samples',
          enabled: true,
          name: i18n.translate('xpack.streams.discoverFlyoutStreamProcessingLink', {
            defaultMessage: 'Discover document',
          }),
          documents: [formattedDoc],
          storageKey: `streams:${value}__custom-samples__discover-document`,
        },
      ],
    },
  } as StreamsAppLocatorParams);

  const message = i18n.translate('xpack.streams.discoverFlyoutStreamProcessingLink', {
    defaultMessage: 'Parse content in Streams',
  });

  return (
    <EuiLink href={href}>
      <EuiToolTip content={message} display="block">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiIcon
            type="sparkles"
            size="s"
            css={css`
              margin-left: ${euiTheme.size.s};
            `}
          />
          <EuiText size="xs" className="eui-textTruncate">
            {message}
          </EuiText>
        </EuiFlexGroup>
      </EuiToolTip>
    </EuiLink>
  );
}

function formatDoc(doc: DataTableRecord, dataView: DataView, fieldFormats: FieldFormatsStart) {
  const fieldsToFormat = Object.keys(doc.flattened).filter(
    (fieldName) => !isMetadataField(fieldName) && fieldName !== '_score'
  );

  return getFormattedFields(doc, fieldsToFormat, {
    dataView,
    fieldFormats,
  });
}
