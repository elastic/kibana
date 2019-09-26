/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { useCanvasShareableState } from '../../context';
import { Footer, Props as FooterProps } from './footer';
export { FOOTER_HEIGHT } from './footer';

type Props = Pick<FooterProps, 'isHidden'>;

/**
 * A store-connected container for the `Footer` component.
 */
export const FooterContainer: FC<Props> = ({ isHidden = false }: Props) => {
  const [{ workpad, settings }] = useCanvasShareableState();

  if (!workpad) {
    return null;
  }

  const { toolbar } = settings;
  const { isAutohide } = toolbar;

  return <Footer {...{ isHidden, isAutohide }} />;
};
