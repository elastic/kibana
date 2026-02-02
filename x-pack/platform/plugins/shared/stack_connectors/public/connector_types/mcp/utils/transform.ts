/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromPairs, isEmpty } from 'lodash';
import type { HeaderField, HeaderFieldType } from '../types';

const filterHeadersByType = (headerType: HeaderFieldType) => (header: HeaderField) =>
  header.type === headerType && !isEmpty(header.key);

export const toHeaderFields = (
  data: Record<string, string>,
  headerType: HeaderFieldType
): HeaderField[] => Object.entries(data).map(([key, value]) => ({ key, value, type: headerType }));

export const toHeadersRecord = (headers: HeaderField[], headerType: HeaderFieldType) =>
  fromPairs(
    headers
      .filter(filterHeadersByType(headerType))
      .map((header) => [header.key, header.value ?? ''])
  );
