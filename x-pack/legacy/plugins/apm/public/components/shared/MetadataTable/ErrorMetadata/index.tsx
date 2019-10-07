/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { isEmpty, set } from 'lodash';
import { idx } from '@kbn/elastic-idx';
import { ERROR_METADATA_SECTIONS } from './sections';
import { APMError } from '../../../../../typings/es_schemas/ui/APMError';
import { MetadataTable } from '..';

interface Props {
  error: APMError;
}

export function ErrorMetadata({ error }: Props) {
  let errorCopy = {};
  if (!isEmpty(error)) {
    errorCopy = {
      ...error,
      error: { id: error.error.id }
    };
    const custom = idx(error, _ => _.error.custom);
    if (custom) {
      set(errorCopy, 'error.custom', custom);
    }
  }
  return <MetadataTable item={errorCopy} sections={ERROR_METADATA_SECTIONS} />;
}
