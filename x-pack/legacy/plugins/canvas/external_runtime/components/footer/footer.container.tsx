/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useExternalEmbedState } from '../../context';
import { Footer as FooterComponent } from './footer';
export { FOOTER_HEIGHT } from './footer';

interface Props {
  isHidden?: boolean;
}

/**
 * The footer of the Embedded Workpad.
 */
export const Footer = ({ isHidden = false }: Props) => {
  const [{ workpad, settings }] = useExternalEmbedState();

  if (!workpad) {
    return null;
  }

  const { toolbar } = settings;
  const { isAutohide } = toolbar;

  return <FooterComponent {...{ isHidden, isAutohide }} />;
};
