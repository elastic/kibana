/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { omit } from 'lodash';
import { KBN_SCREENSHOT_HEADER_BLACKLIST } from '../../../common/constants';

export const omitBlacklistedHeaders = <JobDocPayloadType>({
  job,
  decryptedHeaders,
}: {
  job: JobDocPayloadType;
  decryptedHeaders: Record<string, string>;
}) => {
  const filteredHeaders: Record<string, string> = omit(
    decryptedHeaders,
    KBN_SCREENSHOT_HEADER_BLACKLIST
  );
  return filteredHeaders;
};
