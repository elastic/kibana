/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';

interface Props<T> {
  watch: unknown[];
  init: () => Promise<T>;
  render: (props: T) => JSX.Element | null;
}

export function InitializableComponent<T>(props: Props<T>) {
  const [state, setState] = useState<{ isLoading: boolean; result?: T }>({
    isLoading: true,
    result: undefined,
  });

  useEffect(() => {
    let isStale = false;

    props.init().then(result => {
      if (!isStale) {
        setState({ isLoading: false, result });
      }
    });

    return () => {
      isStale = true;
    };
  }, props.watch);

  if (state.isLoading) {
    // TODO: Handle the loading / undefined result case
    return null;
  }

  return props.render(state.result!);
}
