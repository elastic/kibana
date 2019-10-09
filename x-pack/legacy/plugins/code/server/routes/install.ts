/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, KibanaResponseFactory, RequestHandlerContext } from 'src/core/server';
import { ServerFacade } from '../..';
import { enabledLanguageServers, LanguageServerDefinition } from '../lsp/language_servers';
import { CodeServerRouter } from '../security';
import { CodeServices } from '../distributed/code_services';
import { LspServiceDefinition } from '../distributed/apis';
import { Endpoint } from '../distributed/resource_locator';
import { ServerOptions } from '../server_options';

export function installRoute(
  server: ServerFacade,
  router: CodeServerRouter,
  codeServices: CodeServices,
  options: ServerOptions
) {
  const lspService = codeServices.serviceFor(LspServiceDefinition);
  const kibanaVersion = server.config().get('pkg.version') as string;
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
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const endpoint = await codeServices.locate(req, '');
      const installRes = await Promise.all(
        enabledLanguageServers(options).map(def => status(endpoint, def))
      );
      return res.ok({ body: installRes });
    },
    method: 'GET',
  });

  router.route({
    path: '/api/code/install/{name}',
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const { name } = req.params as any;
      const def = enabledLanguageServers(options).find(d => d.name === name);
      const endpoint = await codeServices.locate(req, '');
      if (def) {
        const installRes = await status(endpoint, def);
        return res.ok({ body: installRes });
      } else {
        return res.notFound({ body: `language server ${name} not found.` });
      }
    },
    method: 'GET',
  });
}
