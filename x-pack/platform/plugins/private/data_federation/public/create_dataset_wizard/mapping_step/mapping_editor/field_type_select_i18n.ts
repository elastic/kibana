/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Localized strings for the mapping editor field type select. */
export const fieldTypeSelectStrings = {
  typeLabel: i18n.translate('xpack.dataFederation.mappingEditor.typeLabel', {
    defaultMessage: 'Field type',
  }),
  fieldTypeDocsLink: (type: string) =>
    i18n.translate('xpack.dataFederation.mappingEditor.fieldTypeDocsLink', {
      defaultMessage: '{type} field documentation',
      values: { type },
    }),
  booleanOption: i18n.translate('xpack.dataFederation.mappingEditor.fieldTypeOption.boolean', {
    defaultMessage: 'Boolean',
  }),
  dateOption: i18n.translate('xpack.dataFederation.mappingEditor.fieldTypeOption.date', {
    defaultMessage: 'Date',
  }),
  dateNanosOption: i18n.translate('xpack.dataFederation.mappingEditor.fieldTypeOption.dateNanos', {
    defaultMessage: 'Date nanos',
  }),
  doubleOption: i18n.translate('xpack.dataFederation.mappingEditor.fieldTypeOption.double', {
    defaultMessage: 'Double',
  }),
  integerOption: i18n.translate('xpack.dataFederation.mappingEditor.fieldTypeOption.integer', {
    defaultMessage: 'Integer',
  }),
  ipOption: i18n.translate('xpack.dataFederation.mappingEditor.fieldTypeOption.ip', {
    defaultMessage: 'IP',
  }),
  keywordOption: i18n.translate('xpack.dataFederation.mappingEditor.fieldTypeOption.keyword', {
    defaultMessage: 'Keyword',
  }),
  longOption: i18n.translate('xpack.dataFederation.mappingEditor.fieldTypeOption.long', {
    defaultMessage: 'Long',
  }),
  unsignedLongOption: i18n.translate(
    'xpack.dataFederation.mappingEditor.fieldTypeOption.unsignedLong',
    {
      defaultMessage: 'Unsigned long',
    }
  ),
};
