/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useCanvasShareableState } from '../../context';
import { Title } from './title';

/**
 * A store-connected container for the `Title` component.
 */
export const TitleContainer = () => {
  const [{ workpad }] = useCanvasShareableState();

  if (!workpad) {
    return null;
  }

  const { name: title } = workpad;

  return <Title {...{ title }} />;
};
