/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac } from 'node:crypto';

/**
 * Computes HMAC-SHA256(key=token, data=`connectorId|spaceId`).
 */
export const computeIngestTokenHash = ({
  connectorId,
  spaceId,
  token,
}: {
  connectorId: string;
  spaceId: string;
  token: string;
}): string => createHmac('sha256', token).update(`${connectorId}|${spaceId}`).digest('hex');
