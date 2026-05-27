/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { VERDICTS_DATA_STREAM, verdictsDataStream, verdictsMappings } from './data_stream';
export type { StoredVerdict, Verdict } from './data_stream';
export { VerdictsClient } from './verdicts_client';
export type { VerdictsDataStreamClient } from './verdicts_client';
export { VerdictsService } from './verdicts_service';
