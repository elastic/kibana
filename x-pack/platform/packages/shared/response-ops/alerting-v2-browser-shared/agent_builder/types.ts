/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';

/*
 * Converts a focused item into an `AttachmentInput` ready for staging.
 * The returned attachment id should be deterministic and entity-scoped
 * (e.g. `episode:{episodeId}`) so persisted attachments remain uniquely
 * identifiable. When the focused item changes, `registerAutoAttach`
 * removes the previous staged attachment before adding the new one.
 */
export interface AttachmentConverter<FocusedItem> {
  toAttachment: (item: FocusedItem) => AttachmentInput;
  getOrigin: (item: FocusedItem) => string;
}

export interface FocusedEpisode {
  episode: AlertEpisode;
  ruleName?: string;
  groupingFields?: readonly string[];
}
