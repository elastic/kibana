/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export const GroupStreamDetailView = ({ stream }: { stream: Streams.GroupStream.GetResponse }) => {
  const meta = [
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.descriptionLabel', {
        defaultMessage: 'Description',
      }),
      description: stream.stream.description,
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.metadataLabel', {
        defaultMessage: 'Metadata',
      }),
      description:
        Object.keys(stream.stream.group.metadata).length === 0 ? (
          i18n.translate('xpack.streams.groupStreamDetailView.noMetadataLabel', {
            defaultMessage: 'None',
          })
        ) : (
          <EuiCodeBlock>
            {Object.entries(stream.stream.group.metadata)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n')}
          </EuiCodeBlock>
        ),
    },
    {
      title: i18n.translate('xpack.streams.groupStreamDetailView.tagsLabel', {
        defaultMessage: 'Tags',
      }),
      description: stream.stream.group.tags.length ? (
        <EuiFlexGroup gutterSize="xs" wrap>
          {stream.stream.group.tags.map((tag, index) => (
            <EuiFlexItem key={index} grow={false}>
              <EuiBadge>{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ) : (
        i18n.translate('xpack.streams.groupStreamDetailView.noneLabel', {
          defaultMessage: 'None',
        })
      ),
    },
  ];

  return <EuiDescriptionList textStyle="reverse" listItems={meta} />;
};
