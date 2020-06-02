/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { omit } from 'lodash';
import {
  KBN_SCREENSHOT_HEADER_BLACKLIST,
  KBN_SCREENSHOT_HEADER_BLACKLIST_STARTS_WITH_PATTERN,
} from '../../../common/constants';

export const omitBlacklistedHeaders = <JobDocPayloadType>({
  job,
  decryptedHeaders,
}: {
  job: JobDocPayloadType;
  decryptedHeaders: Record<string, string>;
}) => {
  const filteredHeaders: Record<string, string> = omit(
    decryptedHeaders,
    (_value, header: string) =>
      header &&
      (KBN_SCREENSHOT_HEADER_BLACKLIST.includes(header) ||
        KBN_SCREENSHOT_HEADER_BLACKLIST_STARTS_WITH_PATTERN.some((pattern) =>
          header?.startsWith(pattern)
        ))
  );
  return filteredHeaders;
};
