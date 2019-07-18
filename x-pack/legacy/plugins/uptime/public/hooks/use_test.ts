/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';

export function useTest(id: string) {
  const [f, setF] = useState<number>(0);
  console.log(f);
  return 0;
}
