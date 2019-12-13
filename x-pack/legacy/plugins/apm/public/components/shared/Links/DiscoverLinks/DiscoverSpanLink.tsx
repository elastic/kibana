/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SPAN_ID } from '../../../../../common/elasticsearch_fieldnames';
import { Span } from '../../../../../typings/es_schemas/ui/Span';
import { DiscoverLink } from './DiscoverLink';

function getDiscoverQuery(span: Span) {
  const query = `${SPAN_ID}:"${span.span.id}"`;
  return {
    _a: {
      interval: 'auto',
      query: {
        language: 'kuery',
        query
      }
    }
  };
}

export const DiscoverSpanLink: React.FC<{
  readonly span: Span;
}> = ({ span, children }) => {
  return <DiscoverLink query={getDiscoverQuery(span)} children={children} />;
};
