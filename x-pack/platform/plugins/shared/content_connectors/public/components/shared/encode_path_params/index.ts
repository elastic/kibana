/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatePath, useParams } from 'react-router-dom';

type PathParams = Record<string, string>;

export const encodePathParams = (pathParams: PathParams) => {
  const encodedParams: PathParams = {};

  Object.entries(pathParams).map(([key, value]) => {
    encodedParams[key] = encodeURIComponent(value);
  });

  return encodedParams;
};

export const generateEncodedPath = (path: string, pathParams: PathParams) => {
  return generatePath(path, encodePathParams(pathParams));
};

export const useDecodedParams = () => {
  const decodedParams: PathParams = {};

  const params = useParams();
  Object.entries(params).map(([key, value]) => {
    decodedParams[key] = decodeURIComponent(value as string);
  });

  return decodedParams;
};
