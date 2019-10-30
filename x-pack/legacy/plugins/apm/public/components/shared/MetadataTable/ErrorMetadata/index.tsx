/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { ERROR_METADATA_SECTIONS } from './sections';
import { APMError } from '../../../../../typings/es_schemas/ui/APMError';
import { getSectionsWithRows } from '../helper';
import { MetadataTable } from '..';

interface Props {
  error: APMError;
}

export function ErrorMetadata({ error }: Props) {
  const sectionsWithRows = useMemo(
    () => getSectionsWithRows(ERROR_METADATA_SECTIONS, error),
    [error]
  );
  return <MetadataTable sections={sectionsWithRows} />;
}
