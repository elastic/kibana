/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ViewSpec } from '@kbn/adaptive-ui';
import {
  Badge,
  BadgeGroup,
  CodeBlock,
  DescriptionList,
  DescriptionListItem,
  Text,
  View,
  toViewSpec,
} from '@kbn/adaptive-ui/jsx';

/**
 * Mirror of the `platform.ki_feature` attachment data (a Streams "key insight"
 * feature). The canonical shape lives in `@kbn/streams-schema`; only the
 * presentational subset is mirrored here.
 */
export interface KiFeatureData {
  name: string;
  type?: string;
  subtype?: string;
  description?: string;
  stream_name?: string;
  confidence?: number;
  tags?: string[];
  filter?: string;
}

/**
 * Alternate rendering for the `platform.ki_feature` attachment: type/subtype
 * badges, the description, a stream/confidence field list, and the optional
 * filter as a highlighted `codeBlock`.
 */
export const toKiFeatureViewSpec = ({
  name,
  type,
  subtype,
  description,
  stream_name: streamName,
  confidence,
  tags,
  filter,
}: KiFeatureData): ViewSpec => {
  const hasDetails = Boolean(streamName || confidence != null || tags?.length);

  return toViewSpec(
    <View title={name} subtitle="Key insight feature">
      {(type || subtype) && (
        <BadgeGroup>
          {type && <Badge label={type} tone="primary" variant="fill" />}
          {subtype && <Badge label={subtype} tone="neutral" variant="hollow" />}
        </BadgeGroup>
      )}
      {description && <Text body={description} />}
      {hasDetails && (
        <DescriptionList label="Feature" layout="inline">
          {streamName && <DescriptionListItem title="Stream" description={streamName} />}
          {confidence != null && (
            <DescriptionListItem title="Confidence" description={`${confidence}%`} />
          )}
          {tags && tags.length > 0 && (
            <DescriptionListItem title="Tags" description={tags.join(', ')} />
          )}
        </DescriptionList>
      )}
      {filter && <CodeBlock language="kql" code={filter} title="Filter" />}
    </View>
  );
};

export const sampleKiFeature: KiFeatureData = {
  name: 'Elevated 5xx on /charge',
  type: 'metric',
  subtype: 'error_rate',
  description:
    'The 5xx ratio on POST /charge is a leading indicator of dropped payments on payment-service.',
  stream_name: 'logs-payment-service',
  confidence: 88,
  tags: ['payments', 'availability'],
  filter: 'url.path : "/charge" and http.response.status_code >= 500',
};
