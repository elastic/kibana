/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

export const getBaseBreadcrumb = () => ({
  text: 'Canvas',
  href: '#/',
});

export const getWorkpadBreadcrumb = ({ name = 'Workpad', id } = {}) => {
  const output = { text: name };
  if (id != null) {
    output.href = `#/workpad/${id}`;
  }
  return output;
};

export const setBreadcrumb = paths => {
  chrome.breadcrumbs.set(Array.isArray(paths) ? paths : [paths]);
};
