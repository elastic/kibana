/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useStreamsAppParams } from './use_streams_app_params';

/**
 * The unit id of the current `/v2/unit/{unitId}/{tab}` route. Throws when rendered outside that route.
 */
export const useUnitId = (): string => useStreamsAppParams('/v2/unit/{unitId}/{tab}').path.unitId;
