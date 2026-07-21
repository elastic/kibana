/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type SourceType = 'esql' | 'connector';

/**
 * Human-readable label for each source type, shown in the source type tag.
 * Keyed by `SourceType` so adding a new type is a compile error until a label
 * is provided.
 */
export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  esql: i18n.translate('xpack.contextEngine.sourceType.esql', {
    defaultMessage: 'ES|QL',
  }),
  connector: i18n.translate('xpack.contextEngine.sourceType.connector', {
    defaultMessage: 'Connector',
  }),
};

export interface SelectedSource {
  type: SourceType;
  /** Stable identifier, unique within a source type (e.g. the ES|QL query). */
  id: string;
  /** Human-readable label rendered in the selected-source chips. */
  label: string;
  /** Underlying source value sent to the AI index API (e.g. the ES|QL query). */
  value: string;
}
