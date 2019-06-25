/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useState } from 'react';

export const useLogHighlightsState = ({}) => {
  const [highlightTerms, setHighlightTerms] = useState<string[]>([]);

  return {
    highlightTerms,
    setHighlightTerms,
  };
};

export const LogHighlightsState = createContainer(useLogHighlightsState);
