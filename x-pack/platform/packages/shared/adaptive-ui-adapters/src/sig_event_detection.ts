/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badge, codeBlock, descriptionList, text, view } from '@kbn/adaptive-ui/builders';
import type { BodyNode, Tone, ViewSpec } from '@kbn/adaptive-ui';

/**
 * Mirror of the `platform.sig_event_detection` attachment data. The canonical
 * change-point shape lives in `@kbn/streams-schema`; only the presentational
 * subset is mirrored here.
 */
export interface SigEventDetectionData {
  rule_name: string;
  stream_name?: string;
  change_point_type?: string;
  timestamp?: string;
  description?: string;
  esql_query?: string;
}

const CHANGE_POINT_TONE: Record<string, Tone> = {
  spike: 'danger',
  dip: 'warning',
  step_change: 'primary',
  trend_change: 'primary',
  distribution_change: 'warning',
};

const changePointTone = (type?: string): Tone =>
  (type ? CHANGE_POINT_TONE[type] : undefined) ?? 'neutral';

const humanize = (value?: string): string | undefined => value?.replace(/_/g, ' ');

/**
 * Alternate rendering for the `platform.sig_event_detection` attachment: a
 * change-point badge over a rule/stream/timestamp field list.
 */
export const toSigEventDetectionViewSpec = ({
  rule_name: ruleName,
  stream_name: streamName,
  change_point_type: changePointType,
  timestamp,
  description,
  esql_query: esqlQuery,
}: SigEventDetectionData): ViewSpec => {
  const body: BodyNode[] = [];

  if (changePointType) {
    body.push(
      badge({
        items: [
          {
            label: humanize(changePointType) ?? changePointType,
            tone: changePointTone(changePointType),
            variant: 'fill',
          },
        ],
      })
    );
  }

  if (description) {
    body.push(text({ body: description }));
  }

  const details: Array<{ title: string; description: string }> = [
    { title: 'Detection rule', description: ruleName },
  ];
  if (streamName) {
    details.push({ title: 'Stream', description: streamName });
  }
  if (timestamp) {
    details.push({ title: 'Detected at', description: timestamp });
  }
  body.push(descriptionList({ label: 'Detection', layout: 'inline', items: details }));

  if (esqlQuery) {
    body.push(codeBlock({ language: 'esql', code: esqlQuery, title: 'ES|QL', collapsible: true }));
  }

  return view({ title: ruleName, subtitle: 'Significant event detection', body });
};

export const sampleSigEventDetection: SigEventDetectionData = {
  rule_name: 'Payment error rate',
  stream_name: 'logs-payment-service',
  change_point_type: 'spike',
  timestamp: '2026-08-19T14:05:00.000Z',
  description: '5xx on POST /charge rose 0.4% → 6.1% — a spike well outside the trailing baseline.',
  esql_query:
    'FROM logs-payment-service\n| WHERE url.path == "/charge" AND http.response.status_code >= 500\n| STATS error_rate = COUNT(*) BY DATE_TRUNC(1 minute, @timestamp)',
};
