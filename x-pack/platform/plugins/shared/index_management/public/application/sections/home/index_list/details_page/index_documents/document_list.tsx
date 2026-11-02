/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { MappingProperty, SearchHit } from '@elastic/elasticsearch/lib/api/types';

import {
  Result,
  resultMetaData,
  resultToField,
  reorderFieldsInImportance,
} from '@kbn/search-index-documents';

import { EuiSpacer } from '@elastic/eui';

export interface DocumentListProps {
  docs: SearchHit[];
  mappingProperties: Record<string, MappingProperty>;
}

export const DocumentList = ({ docs, mappingProperties }: DocumentListProps) => {
  return (
    <>
      {docs.map((doc) => {
        return (
          <React.Fragment key={doc._id}>
            <Result
              fields={reorderFieldsInImportance(resultToField(doc, mappingProperties))}
              metaData={resultMetaData(doc)}
              compactCard={false}
            />
            <EuiSpacer size="s" />
          </React.Fragment>
        );
      })}
    </>
  );
};
