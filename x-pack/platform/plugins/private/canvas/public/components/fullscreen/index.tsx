/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext } from 'react';
import { Fullscreen as Component } from './fullscreen';

import { WorkpadRoutingContext } from '../../routes/workpad';

interface Props {
  children: (props: {
    isFullscreen: boolean;
    windowSize: { width: number; height: number };
  }) => JSX.Element;
}

export const Fullscreen: FC<Props> = ({ children }) => {
  const { isFullscreen } = useContext(WorkpadRoutingContext);

  return <Component isFullscreen={isFullscreen} children={children} />;
};
