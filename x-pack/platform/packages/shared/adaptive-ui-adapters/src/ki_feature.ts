/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badge, codeBlock, descriptionList, text, view } from '@kbn/adaptive-ui/builders';
import type { BodyNode, ViewSpec } from '@kbn/adaptive-ui';

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
  const body: BodyNode[] = [];

  const badges = [
    ...(type ? [{ label: type, tone: 'primary' as const, variant: 'fill' as const }] : []),
    ...(subtype ? [{ label: subtype, tone: 'neutral' as const, variant: 'hollow' as const }] : []),
  ];
  if (badges.length > 0) {
    body.push(badge({ items: badges }));
  }

  if (description) {
    body.push(text({ body: description }));
  }

  const details: Array<{ title: string; description: string }> = [];
  if (streamName) {
    details.push({ title: 'Stream', description: streamName });
  }
  if (confidence != null) {
    details.push({ title: 'Confidence', description: `${confidence}%` });
  }
  if (tags && tags.length > 0) {
    details.push({ title: 'Tags', description: tags.join(', ') });
  }
  if (details.length > 0) {
    body.push(descriptionList({ label: 'Feature', layout: 'inline', items: details }));
  }

  if (filter) {
    body.push(codeBlock({ language: 'kql', code: filter, title: 'Filter' }));
  }

  return view({ title: name, subtitle: 'Key insight feature', body });
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
