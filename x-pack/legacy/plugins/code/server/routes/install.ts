/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Boom from 'boom';

import { RequestFacade } from '../..';
import { enabledLanguageServers, LanguageServerDefinition } from '../lsp/language_servers';
import { LspService } from '../lsp/lsp_service';
import { CodeServerRouter } from '../security';

export function installRoute(router: CodeServerRouter, lspService: LspService) {
  const kibanaVersion = router.server.config().get('pkg.version') as string;
  const status = (def: LanguageServerDefinition) => ({
    name: def.name,
    status: lspService.languageServerStatus(def.name),
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
    handler() {
      return enabledLanguageServers(router.server).map(status);
    },
    method: 'GET',
  });

  router.route({
    path: '/api/code/install/{name}',
    handler(req: RequestFacade) {
      const name = req.params.name;
      const def = enabledLanguageServers(router.server).find(d => d.name === name);
      if (def) {
        return status(def);
      } else {
        return Boom.notFound(`language server ${name} not found.`);
      }
    },
    method: 'GET',
  });
}
