/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useExternalEmbedState } from '../context';
import { Page as PageComponent } from './page';

interface Props {
  index: number;
}

export const Page = ({ index }: Props) => {
  const [{ workpad }] = useExternalEmbedState();

  if (!workpad) {
    return null;
  }

  const { height, width, pages } = workpad;
  const page = pages[index];

  return <PageComponent {...{ page, height, width }} />;
};
