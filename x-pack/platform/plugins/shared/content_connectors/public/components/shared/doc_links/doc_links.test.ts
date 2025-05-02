/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { docLinksServiceMock } from '@kbn/core/public/mocks';

import { docLinks } from '.';

describe('DocLinks', () => {
  it('setDocLinks', () => {
    const links = {
      DOC_LINK_VERSION: docLinksServiceMock.createStartContract().DOC_LINK_VERSION,
      ELASTIC_WEBSITE_URL: docLinksServiceMock.createStartContract().ELASTIC_WEBSITE_URL,
      links: docLinksServiceMock.createStartContract().links,
    };

    docLinks.setDocLinks(links as any);

    expect(docLinks.cloudIndexManagement).toEqual(links.links.cloud.indexManagement);
    expect(docLinks.enterpriseSearchConfig).toEqual(links.links.enterpriseSearch.configuration);
  });
});
