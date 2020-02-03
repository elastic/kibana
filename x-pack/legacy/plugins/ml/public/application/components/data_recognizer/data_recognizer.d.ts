/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FC } from 'react';
import { SavedSearchSavedObject } from '../../../../common/types/kibana';
import { IndexPattern } from '../../../../../../../../src/plugins/data/public';

declare const DataRecognizer: FC<{
  indexPattern: IndexPattern;
  savedSearch: SavedSearchSavedObject | null;
  results: {
    count: number;
    onChange?: Function;
  };
  className?: string;
}>;
