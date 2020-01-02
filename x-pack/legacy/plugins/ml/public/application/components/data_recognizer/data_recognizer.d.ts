/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FC } from 'react';

import { IndexPattern } from 'ui/index_patterns';
import { SavedSearchSavedObject } from '../../../../common/types/kibana';

declare const DataRecognizer: FC<{
  indexPattern: IndexPattern;
  savedSearch?: SavedSearchSavedObject | null;
  results: {
    count: number;
    onChange?: Function;
  };
  className?: string;
}>;
