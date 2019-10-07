/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ERROR_METADATA_SECTIONS } from './sections';
import { APMError } from '../../../../../typings/es_schemas/ui/APMError';
import { MetadataTable } from '..';

interface Props {
  error: APMError;
}

export function ErrorMetadata({ error }: Props) {
  const errorCopy = {
    ...error,
    error: { id: error.error.id }
  };
  return <MetadataTable item={errorCopy} sections={ERROR_METADATA_SECTIONS} />;
}
