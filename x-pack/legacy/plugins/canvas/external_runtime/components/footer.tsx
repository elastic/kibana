/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import classnames from 'classnames';
// @ts-ignore CSS Module
import style from './footer.module';
import { useAppStateValue } from '../context';
import { Page } from './page';

const THUMBNAIL_HEIGHT = 100;

export const Footer = ({ isVisible }: { isVisible?: boolean }) => {
  const [{ workpad }, dispatch] = useAppStateValue();
  if (!workpad) {
    return null;
  }

  const { pages, height, width } = workpad;
  const scale = THUMBNAIL_HEIGHT / height;
  const className = isVisible ? classnames(style.footer, style.visible) : style.footer;

  const onClick = (index: number) =>
    dispatch({
      type: 'setPage',
      page: index,
    });

  const slides = pages.map((page, index) => {
    return (
      <div
        key={page.id}
        className={style.slide}
        onClick={() => onClick(index)}
        onKeyPress={() => onClick(index)}
        style={{
          transform: `scale3d(${scale}, ${scale}, 1)`,
          height: height * scale,
          width: width * scale,
        }}
      >
        <Page page={page} />
      </div>
    );
  });
  return (
    <div className={className}>
      <div className={style.slideContainer}>{slides}</div>
    </div>
  );
};
