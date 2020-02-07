/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { SPAN_METADATA_SECTIONS } from './sections';
import { Span } from '../../../../../typings/es_schemas/ui/Span';
import { getSectionsWithRows } from '../helper';
import { MetadataTable } from '..';

interface Props {
  span: Span;
}

export function SpanMetadata({ span }: Props) {
  const sectionsWithRows = useMemo(
    () => getSectionsWithRows(SPAN_METADATA_SECTIONS, span),
    [span]
  );
  return <MetadataTable sections={sectionsWithRows} />;
}
