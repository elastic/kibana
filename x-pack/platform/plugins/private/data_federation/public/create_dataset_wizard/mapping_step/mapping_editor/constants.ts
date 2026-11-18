/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksStart } from '@kbn/core-doc-links-browser';

import type { DatasetMappingFieldType } from '../../../../common';
import type { MappingEditorValue } from './mapping_editor';
import { fieldTypeSelectStrings } from './field_type_select_i18n';

export const emptyMappingEditorValue: MappingEditorValue = {
  dynamic: true,
  fields: [],
};

export const TYPE_LABEL_BY_VALUE: Record<DatasetMappingFieldType, string> = {
  boolean: fieldTypeSelectStrings.booleanOption,
  date: fieldTypeSelectStrings.dateOption,
  date_nanos: fieldTypeSelectStrings.dateNanosOption,
  double: fieldTypeSelectStrings.doubleOption,
  integer: fieldTypeSelectStrings.integerOption,
  ip: fieldTypeSelectStrings.ipOption,
  keyword: fieldTypeSelectStrings.keywordOption,
  long: fieldTypeSelectStrings.longOption,
  unsigned_long: fieldTypeSelectStrings.unsignedLongOption,
};

export const getTypeDocsByValue = (
  docLinks: DocLinksStart
): Record<DatasetMappingFieldType, string> => {
  const esLinks = docLinks.links.elasticsearch;

  return {
    boolean: esLinks.mappingBoolean,
    date: esLinks.mappingDate,
    date_nanos: esLinks.mappingDate,
    double: esLinks.mappingNumber,
    integer: esLinks.mappingNumber,
    ip: esLinks.mappingIp,
    keyword: esLinks.mappingKeyword,
    long: esLinks.mappingNumber,
    unsigned_long: esLinks.mappingUnsignedLong,
  };
};
