/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';
import {
  collapseLiteralStrings,
  expandLiteralStrings,
  XJsonMode,
} from '../../../../shared_imports';

export const xJsonMode = new XJsonMode();

export const useXJsonMode = (json: string) => {
  const [xJson, setXJson] = useState(expandLiteralStrings(json));

  return {
    xJson,
    setXJson,
    xJsonMode,
    convertToJson: collapseLiteralStrings,
  };
};
