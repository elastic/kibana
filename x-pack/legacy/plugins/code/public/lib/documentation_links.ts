/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';

// TODO make sure document links are right
export const documentationLinks = {
  code: `${npStart.core.docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${npStart.core.docLinks.DOC_LINK_VERSION}/code.html`,
  codeIntelligence: `${npStart.core.docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${npStart.core.docLinks.DOC_LINK_VERSION}/code.html`,
  gitFormat: `${npStart.core.docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${npStart.core.docLinks.DOC_LINK_VERSION}/code.html`,
  codeInstallLangServer: `${npStart.core.docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${npStart.core.docLinks.DOC_LINK_VERSION}/code-install-lang-server.html`,
  codeGettingStarted: `${npStart.core.docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${npStart.core.docLinks.DOC_LINK_VERSION}/import-first-repo.html`,
  codeRepoManagement: `${npStart.core.docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${npStart.core.docLinks.DOC_LINK_VERSION}/code-repo-management.html`,
  codeSearch: `${npStart.core.docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${npStart.core.docLinks.DOC_LINK_VERSION}/code-search.html`,
  codeOtherFeatures: `${npStart.core.docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${npStart.core.docLinks.DOC_LINK_VERSION}/code-basic-nav.html`,
  semanticNavigation: `${npStart.core.docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${npStart.core.docLinks.DOC_LINK_VERSION}/code-semantic-nav.html`,
  kibanaRoleManagement: `${npStart.core.docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${npStart.core.docLinks.DOC_LINK_VERSION}/kibana-role-management.html`,
};
