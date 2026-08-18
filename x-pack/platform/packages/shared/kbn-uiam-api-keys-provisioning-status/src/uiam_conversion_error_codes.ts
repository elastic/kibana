/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * UIAM convert error codes that indicate a permanent failure: rules or tasks
 * whose `uiam_api_keys_provisioning_status` doc carries any of these codes are
 * excluded from future provisioning attempts.
 *
 * Source: https://github.com/elastic/uiam/blob/main/modules/domain/src/main/java/co/elastic/cloud/uiam/domain/errors/ErrorCode.java
 */
export const NON_CLOUD_USER_API_KEY_CREATOR_ERROR_CODE = '0x357391';
export const API_KEY_CREATOR_NOT_ORG_MEMBER_ERROR_CODE = '0xBE2B58';

export const PERMANENT_UIAM_CONVERSION_ERROR_CODES: readonly string[] = [
  NON_CLOUD_USER_API_KEY_CREATOR_ERROR_CODE,
  API_KEY_CREATOR_NOT_ORG_MEMBER_ERROR_CODE,
];
