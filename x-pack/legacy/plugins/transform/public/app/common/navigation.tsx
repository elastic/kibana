/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { Redirect } from 'react-router-dom';
import rison from 'rison-node';

import { CLIENT_BASE_PATH, SECTION_SLUG } from '../constants';

/**
 * Gets a url for navigating to Discover page.
 * @param indexPatternId Index pattern ID.
 * @param baseUrl Base url.
 */
export function getDiscoverUrl(indexPatternId: string, baseUrl: string): string {
  const _g = rison.encode({});

  // Add the index pattern ID to the appState part of the URL.
  const _a = rison.encode({
    index: indexPatternId,
  });

  const hash = `#/discover?_g=${_g}&_a=${_a}`;

  return `${baseUrl}${hash}`;
}

export const RedirectToTransformManagement: FC = () => (
  <Redirect from={`${CLIENT_BASE_PATH}`} to={`${CLIENT_BASE_PATH}/${SECTION_SLUG.HOME}`} />
);

export const RedirectToCreateTransform: FC<{ savedObjectId: string }> = ({ savedObjectId }) => (
  <Redirect to={`${CLIENT_BASE_PATH}/${SECTION_SLUG.CREATE_TRANSFORM}/${savedObjectId}`} />
);
