/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksStart } from '@kbn/core-doc-links-browser';

import type { DatasetMappingFieldType } from '../../../common';

const TYPE_LABEL_BY_VALUE: Record<DatasetMappingFieldType, string> = {
  boolean: 'Boolean',
  date: 'Date',
  double: 'Double',
  integer: 'Integer',
  ip: 'IP',
  keyword: 'Keyword',
  long: 'Long',
  unsigned_long: 'Unsigned long',
};

export const getTypeInfoByValue = (
  docLinks: DocLinksStart
): Record<DatasetMappingFieldType, { label: string; docs: string }> => {
  const esLinks = docLinks.links.elasticsearch;

  return {
    boolean: { label: TYPE_LABEL_BY_VALUE.boolean, docs: esLinks.mappingBoolean },
    date: { label: TYPE_LABEL_BY_VALUE.date, docs: esLinks.mappingDate },
    double: { label: TYPE_LABEL_BY_VALUE.double, docs: esLinks.mappingNumber },
    integer: { label: TYPE_LABEL_BY_VALUE.integer, docs: esLinks.mappingNumber },
    ip: { label: TYPE_LABEL_BY_VALUE.ip, docs: esLinks.mappingIp },
    keyword: { label: TYPE_LABEL_BY_VALUE.keyword, docs: esLinks.mappingKeyword },
    long: { label: TYPE_LABEL_BY_VALUE.long, docs: esLinks.mappingNumber },
    unsigned_long: {
      label: TYPE_LABEL_BY_VALUE.unsigned_long,
      docs: esLinks.mappingUnsignedLong,
    },
  };
};
