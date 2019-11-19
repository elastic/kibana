/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';

import { DataType } from '../types';
import { TYPE_DEFINITION } from '../constants';

const base = `${ELASTIC_WEBSITE_URL}guide/en`;
const esBase = `${base}/elasticsearch/reference/${DOC_LINK_VERSION}`;

export const getTypeDocLink = (type: DataType): string | undefined => {
  const typeDefinition = TYPE_DEFINITION[type];
  if (!typeDefinition || !typeDefinition.docUri) {
    return undefined;
  }
  return esBase + typeDefinition.docUri;
};
