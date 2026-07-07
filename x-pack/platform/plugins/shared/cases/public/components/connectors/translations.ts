/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INVALID_JSON_FORMAT = i18n.translate(
  'xpack.cases.connectors.serviceNow.additionalFieldsFormatErrorMessage',
  {
    defaultMessage: 'Invalid JSON.',
  }
);

export const MAX_ATTRIBUTES_ERROR = (length: number) =>
  i18n.translate('xpack.cases.connectors.serviceNow.additionalFieldsLengthError', {
    values: { length },
    defaultMessage: 'A maximum of {length} additional fields can be defined at a time.',
  });

export const CARD_TABLE_FIELD_COLUMN_NAME = i18n.translate(
  'xpack.cases.connectors.connectorCard.table.propertyColumnName',
  {
    defaultMessage: 'Field',
  }
);

export const CARD_TABLE_VALUE_COLUMN_NAME = i18n.translate(
  'xpack.cases.connectors.connectorCard.table.valueColumnName',
  {
    defaultMessage: 'Value',
  }
);

export const CARD_TABLE_CAPTION = i18n.translate(
  'xpack.cases.connectors.connectorCard.table.caption',
  {
    defaultMessage: 'Connector fields table',
  }
);
