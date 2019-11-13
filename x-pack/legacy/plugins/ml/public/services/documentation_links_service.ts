/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Core, Plugins } from '../shim';

export class DocumentationLinksService {
  private elasticWebsiteUrl: string = '';
  private esDocBasePath: string = '';
  private esStackOverviewDocBasePath: string = '';
  private kibanaDocBasePath: string = '';

  // This should mirror the plugin lifecycle to make reasoning about how the service is executed more clear.
  public setup(core: Core, plugins: Plugins): void {
    const { documentation } = core;

    this.elasticWebsiteUrl = documentation.elasticWebsiteUrl;
    this.esDocBasePath = documentation.esDocBasePath;
    this.esStackOverviewDocBasePath = documentation.esStackOverviewDocBasePath;
    this.kibanaDocBasePath = documentation.kibanaDocBasePath;
  }

  public start() {
    return {
      getElasticWebsiteUrl: () => {
        return this.elasticWebsiteUrl;
      },
      getEsDocBasePath: () => {
        return this.esDocBasePath;
      },
      getKQLDocUrl: () => {
        return `${this.kibanaDocBasePath}kuery-query.html`;
      },
      getRulesDocUrl: () => {
        return `${this.esStackOverviewDocBasePath}ml-rules.html`;
      },
    };
  }
}
