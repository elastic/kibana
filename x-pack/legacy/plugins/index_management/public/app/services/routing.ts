/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BASE_PATH } from '../../../common/constants';

export const getTemplateListLink = () => {
  return `${BASE_PATH}templates`;
};

// Need to add some additonal encoding/decoding logic to work with React Router
// For background, see: https://github.com/ReactTraining/history/issues/505
export const getTemplateDetailsLink = (name: string, withHash = false) => {
  const baseUrl = `${BASE_PATH}templates/${encodeURIComponent(encodeURIComponent(name))}`;
  const url = withHash ? `#${baseUrl}` : baseUrl;
  return encodeURI(url);
};

export const getTemplateEditLink = (name: string) => {
  return encodeURI(`${BASE_PATH}edit_template/${encodeURIComponent(encodeURIComponent(name))}`);
};

export const getTemplateCloneLink = (name: string) => {
  return encodeURI(`${BASE_PATH}clone_template/${encodeURIComponent(encodeURIComponent(name))}`);
};

export const decodePath = (pathname: string): string => {
  let decodedPath;
  try {
    decodedPath = decodeURI(pathname);
    decodedPath = decodeURIComponent(decodedPath);
  } catch (_error) {
    decodedPath = decodeURIComponent(pathname);
  }
  return decodeURIComponent(decodedPath);
};
