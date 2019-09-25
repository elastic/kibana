/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Boom from '@hapi/boom';

import { RequestFacade } from '../..';
import { enabledLanguageServers, LanguageServerDefinition } from '../lsp/language_servers';
import { CodeServerRouter } from '../security';
import { CodeServices } from '../distributed/code_services';
import { LspServiceDefinition } from '../distributed/apis';
import { Endpoint } from '../distributed/resource_locator';

export function installRoute(router: CodeServerRouter, codeServices: CodeServices) {
  const lspService = codeServices.serviceFor(LspServiceDefinition);
  const kibanaVersion = router.server.config().get('pkg.version') as string;
  const status = async (endpoint: Endpoint, def: LanguageServerDefinition) => ({
    name: def.name,
    status: await lspService.languageServerStatus(endpoint, { langName: def.name }),
    version: def.version,
    build: def.build,
    languages: def.languages,
    installationType: def.installationType,
    downloadUrl:
      typeof def.downloadUrl === 'function' ? def.downloadUrl(kibanaVersion) : def.downloadUrl,
    pluginName: def.installationPluginName,
  });

  router.route({
    path: '/api/code/install',
    async handler(req: RequestFacade) {
      const endpoint = await codeServices.locate(req, '');
      return await Promise.all(
        enabledLanguageServers(router.server).map(def => status(endpoint, def))
      );
    },
    method: 'GET',
  });

  router.route({
    path: '/api/code/install/{name}',
    async handler(req: RequestFacade) {
      const name = req.params.name;
      const def = enabledLanguageServers(router.server).find(d => d.name === name);
      const endpoint = await codeServices.locate(req, '');
      if (def) {
        return await status(endpoint, def);
      } else {
        return Boom.notFound(`language server ${name} not found.`);
      }
    },
    method: 'GET',
  });
}
