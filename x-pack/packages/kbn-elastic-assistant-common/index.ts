/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { GetCapabilitiesResponse } from './impl/schemas/capabilities/get_capabilities_route.gen';

export { defaultAssistantFeatures } from './impl/capabilities';
export type { AssistantFeatures } from './impl/capabilities';

export { getAnonymizedValue } from './impl/data_anonymization/get_anonymized_value';

export {
  getIsDataAnonymizable,
  isAllowed,
  isAnonymized,
  isDenied,
} from './impl/data_anonymization/helpers';

export { transformRawData } from './impl/data_anonymization/transform_raw_data';
