/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { getAPMIndexPattern } from '../services/rest/apm/index_patterns';
import { IndexPatternApiResponse } from '../../server/routes/index_patterns/index_pattern';

export function useAPMIndexPattern() {
  const [pattern, setPattern] = useState<IndexPatternApiResponse | null>(null);

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
