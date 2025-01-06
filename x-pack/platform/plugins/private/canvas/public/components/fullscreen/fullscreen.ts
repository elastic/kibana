/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FC, useEffect, useState } from 'react';
import { debounce } from 'lodash';
import { getWindow } from '../../lib/get_window';

interface Props {
  isFullscreen?: boolean;
  children: (props: {
    isFullscreen: boolean;
    windowSize: { width: number; height: number };
  }) => JSX.Element;
}

export const Fullscreen: FC<Props> = ({ isFullscreen = false, children }) => {
  const [width, setWidth] = useState(getWindow().innerWidth);
  const [height, setHeight] = useState(getWindow().innerHeight);

  const onWindowResize = debounce(({ target }) => {
    const { innerWidth, innerHeight } = target as Window;
    setWidth(innerWidth);
    setHeight(innerHeight);
  }, 100);

  useEffect(() => {
    const window = getWindow();
    window.addEventListener('resize', onWindowResize);

    return () => window.removeEventListener('resize', onWindowResize);
  });

  const windowSize = {
    width,
    height,
  };

  return children({ isFullscreen, windowSize });
};
