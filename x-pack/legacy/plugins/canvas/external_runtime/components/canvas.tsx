/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { useAppStateValue } from '../context';
import { Page } from './page';
import { Footer } from './footer';

export const Canvas = () => {
  const [{ workpad, height: containerHeight, width: containerWidth, page }] = useAppStateValue();
  if (!workpad) {
    return null;
  }

  const [isFooterVisible, setFooterVisible] = useState(false);
  const { height, width, pages } = workpad;
  const ratio = Math.max(width / containerWidth, height / containerHeight);
  const transform = `scale3d(${containerHeight / (containerHeight * ratio)}, ${containerWidth /
    (containerWidth * ratio)}, 1)`;

  return (
    <div
      style={{
        position: 'relative',
        height: containerHeight,
        width: containerWidth,
        overflow: 'hidden',
      }}
      onFocus={() => setFooterVisible(true)}
      onMouseOver={() => setFooterVisible(true)}
      onMouseOut={() => setFooterVisible(false)}
      onBlur={() => setFooterVisible(false)}
    >
      <div
        className="canvas canvasContainer"
        style={{
          alignItems: 'center',
          display: 'flex',
          height: containerHeight,
          width: containerWidth,
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            height,
            transform,
            position: 'absolute',
            transformOrigin: 'center center',
            width,
          }}
        >
          <Page page={pages[page]} />
        </div>
      </div>
      <Footer isVisible={isFooterVisible} />
    </div>
  );
};
