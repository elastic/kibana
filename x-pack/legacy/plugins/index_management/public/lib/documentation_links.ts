/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';

const base = `${ELASTIC_WEBSITE_URL}guide/en`;
const esBase = `${base}/elasticsearch/reference/${DOC_LINK_VERSION}`;
const kibanaBase = `${base}/kibana/${DOC_LINK_VERSION}`;

export const settingsDocumentationLink = `${esBase}/index-modules.html#index-modules-settings`;
export const mappingDocumentationLink = `${esBase}/mapping.html`;
export const templatesDocumentationLink = `${esBase}/indices-templates.html`;

export const idxMgmtDocumentationLink = `${kibanaBase}/managing-indices.html`;
