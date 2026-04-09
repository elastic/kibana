/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// Max base64-encoded logo data length (256KB), consistent with the UIAM API.
const CLIENT_LOGO_MAX_DATA_LENGTH = 262144;

export const clientLogoSchema = schema.object({
  media_type: schema.string(),
  data: schema.string({ maxLength: CLIENT_LOGO_MAX_DATA_LENGTH }),
});
