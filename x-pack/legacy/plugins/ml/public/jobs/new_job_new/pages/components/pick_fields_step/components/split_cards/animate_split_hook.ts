/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

export const ANIMATION_SWITCH_DELAY_MS = 1000;

export function useAnimateSplit() {
  const [animateSplit, setAnimateSplit] = useState(false);
  useEffect(() => {
    setTimeout(() => {
      setAnimateSplit(true);
    }, ANIMATION_SWITCH_DELAY_MS);
  }, []);

  return animateSplit;
}
