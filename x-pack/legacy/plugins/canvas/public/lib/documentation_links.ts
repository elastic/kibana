/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getCoreStart } from '../legacy';

export const getDocumentationLinks = () => ({
  canvas: `${getCoreStart().docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${
    getCoreStart().docLinks.DOC_LINK_VERSION
  }/canvas.html`,
});
