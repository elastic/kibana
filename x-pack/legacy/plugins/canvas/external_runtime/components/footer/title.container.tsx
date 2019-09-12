/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useExternalEmbedState } from '../../context';
import { Title as TitleComponent } from './title';

/**
 * The title of the workpad displayed in the right-hand of the footer.
 */
export const Title = () => {
  const [{ workpad }] = useExternalEmbedState();

  if (!workpad) {
    return null;
  }

  const { name: title } = workpad;

  return <TitleComponent {...{ title }} />;
};
