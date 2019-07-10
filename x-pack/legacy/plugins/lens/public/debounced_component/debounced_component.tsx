/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo, memo, FunctionComponent } from 'react';
import { debounce } from 'lodash';

export function debouncedComponent<TProps>(component: FunctionComponent<TProps>, delay = 256) {
  const MemoizedComponent = (memo(component) as unknown) as FunctionComponent<TProps>;

  return memo((props: TProps) => {
    const [rendered, setRendered] = useState(props);
    const delayRender = useMemo(() => debounce(setRendered, delay), []);

    delayRender(props);

    return React.createElement(MemoizedComponent, rendered);
  });
}
