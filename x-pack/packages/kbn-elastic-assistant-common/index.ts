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

export { transformRawData } from './impl/data_anonymization/transform_raw_data';
export { parseBedrockBuffer, handleBedrockChunk } from './impl/utils/bedrock';
export * from './constants';
