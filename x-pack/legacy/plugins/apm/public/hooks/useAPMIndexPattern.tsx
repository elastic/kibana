/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import {
  getAPMIndexPattern,
  ISavedObject
} from '../services/rest/savedObjects';

export function useAPMIndexPattern() {
  const [pattern, setPattern] = useState({} as ISavedObject);

  async function fetchPattern() {
    const indexPattern = await getAPMIndexPattern();
    if (indexPattern) {
      setPattern(indexPattern);
    }
  }

  useEffect(() => {
    fetchPattern();
  }, []);

  return pattern;
}
