/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiLink, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import type { UnmanagedElasticsearchAssetDetails } from '@kbn/streams-plugin/server/lib/streams/stream_crud';
import { css } from '@emotion/css';
import { ManagedBadge } from './managed_badge';

interface IndexTemplateDetailsProps {
  indexTemplate: UnmanagedElasticsearchAssetDetails['indexTemplate'] | undefined;
  onFlyoutOpen: (name: string) => void;
}

export function IndexTemplateDetails({ indexTemplate, onFlyoutOpen }: IndexTemplateDetailsProps) {
  const patterns = indexTemplate?.index_template.index_patterns ?? [];

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      className={css`
        min-width: 400px;
        max-height: 100px;
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiTitle size="xs">
          <p>
            {i18n.translate('xpack.streams.streamDetailView.indexTemplate', {
              defaultMessage: 'Index template',
            })}
          </p>
        </EuiTitle>
        <EuiFlexGroup direction="row" gutterSize="xs">
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiTitle size="xxxs">
              <p>
                {i18n.translate('xpack.streams.streamDetailView.indexTemplateName', {
                  defaultMessage: 'Name',
                })}
              </p>
            </EuiTitle>
            <EuiLink
              onClick={() => {
                onFlyoutOpen(indexTemplate?.name || '');
              }}
            >
              {indexTemplate ? indexTemplate.name : '-'}
              <ManagedBadge meta={indexTemplate?.index_template._meta} />
            </EuiLink>
          </EuiFlexGroup>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiTitle size="xxxs">
              <p>
                {i18n.translate('xpack.streams.streamDetailView.indexPatterns', {
                  defaultMessage: 'Patterns',
                })}
              </p>
            </EuiTitle>
            <EuiText size="s">{Array.isArray(patterns) ? patterns.join(', ') : '-'}</EuiText>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
