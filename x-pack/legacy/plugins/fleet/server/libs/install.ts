/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import { FrameworkLib } from './framework';
import { macosInstallTemplate } from './install_templates/macos';

export class InstallLib {
  constructor(private readonly framework: FrameworkLib) {}

  public getScript(osType: 'macos'): string {
    const variables = { kibanaUrl: this.getKibanaUrl() };

    switch (osType) {
      case 'macos':
        return macosInstallTemplate(variables);
      default:
        throw new Error(`${osType} is not supported.`);
    }
  }

  private getKibanaUrl() {
    const { host: hostname, protocol, port, basePath: pathname } = this.framework.getServerConfig();

    return url.format({
      protocol,
      hostname,
      port,
      pathname,
    });
  }
}
