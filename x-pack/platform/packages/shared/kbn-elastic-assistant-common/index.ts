/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Schema constants
export * from './impl/schemas';

export { defaultAssistantFeatures } from './impl/capabilities';
export type { AssistantFeatures } from './impl/capabilities';

export { getAnonymizedValue } from './impl/data_anonymization/get_anonymized_value';

export {
  getIsDataAnonymizable,
  isAllowed,
  isAnonymized,
  isDenied,
  replaceAnonymizedValuesWithOriginalValues,
  replaceOriginalValuesWithUuidValues,
} from './impl/data_anonymization/helpers';

export {
  newContentReferencesStore,
  securityAlertReference,
  knowledgeBaseReference,
  securityAlertsPageReference,
  productDocumentationReference,
  esqlQueryReference,
  contentReferenceString,
  contentReferenceBlock,
  removeContentReferences,
  pruneContentReferences,
} from './impl/content_references';

export type {
  ContentReferencesStore,
  ContentReferenceBlock,
} from './impl/content_references/types';

export { transformRawData } from './impl/data_anonymization/transform_raw_data';
export { parseBedrockBuffer, handleBedrockChunk } from './impl/utils/bedrock';
export * from './constants';

/** currently the same shape as "fields" property in the ES response */
export { type MaybeRawData } from './impl/alerts/helpers/types';

/**
 * This query returns open and acknowledged (non-building block) alerts in the last 24 hours.
 *
 * The alerts are ordered by risk score, and then from the most recent to the oldest.
 */
export { getOpenAndAcknowledgedAlertsQuery } from './impl/alerts/get_open_and_acknowledged_alerts_query';

/** Returns the raw data if it valid, or a default if it's not */
export { getRawDataOrDefault } from './impl/alerts/helpers/get_raw_data_or_default';

/** Return true if the provided size is out of range */
export { sizeIsOutOfRange } from './impl/alerts/helpers/size_is_out_of_range';

export {
  /** The default (relative) end of the date range (i.e. `now`) */
  DEFAULT_END,
  /** The default (relative) start of the date range (i.e. `now-24h`) */
  DEFAULT_START,
} from './impl/alerts/get_open_and_acknowledged_alerts_query';
