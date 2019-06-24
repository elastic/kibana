/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Boom from 'boom';
import { Request } from 'hapi';
import { enabledLanguageServers, LanguageServerDefinition } from '../lsp/language_servers';
import { LspService } from '../lsp/lsp_service';
import { CodeServerRouter } from '../security';

export function installRoute(server: CodeServerRouter, lspService: LspService) {
  const kibanaVersion = server.server.config().get('pkg.version') as string;
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

  server.route({
    path: '/api/code/install',
    handler() {
      return enabledLanguageServers(server.server).map(status);
    },
    method: 'GET',
  });

  server.route({
    path: '/api/code/install/{name}',
    handler(req: Request) {
      const name = req.params.name;
      const def = enabledLanguageServers(server.server).find(d => d.name === name);
      if (def) {
        return status(def);
      } else {
        return Boom.notFound(`language server ${name} not found.`);
      }
    },
    method: 'GET',
  });
}
