/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FC } from 'react';

import { IndexPattern } from 'ui/index_patterns';
import { SavedSearch } from 'src/legacy/core_plugins/kibana/public/discover/types';

declare const DataRecognizer: FC<{
  indexPattern: IndexPattern;
  savedSearch?: SavedSearch;
  results: {
    count: number;
    onChange?: Function;
  };
  className?: string;
}>;
