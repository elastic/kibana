/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { defaults } from 'lodash';
import { props, reduce as reduceAsync } from 'bluebird';
import Boom from 'boom';
import { resolve } from 'path';
import { i18n } from '@kbn/i18n';
import { AppBootstrap } from './bootstrap';

export function uiRenderMixin(kbnServer, server, config) {
  function replaceInjectedVars(request, injectedVars) {
    const { injectedVarsReplacers = [] } = kbnServer.uiExports;

    return reduceAsync(
      injectedVarsReplacers,
      async (acc, replacer) => await replacer(acc, request, kbnServer.server),
      injectedVars
    );
  }

  let defaultInjectedVars = {};
  kbnServer.afterPluginsInit(() => {
    const { defaultInjectedVarProviders = [] } = kbnServer.uiExports;
    defaultInjectedVars = defaultInjectedVarProviders
      .reduce((allDefaults, { fn, pluginSpec }) => (
        defaults(
          allDefaults,
          fn(kbnServer.server, pluginSpec.readConfigValue(kbnServer.config, []))
        )
      ), {});
  });

  // render all views from ./views
  server.setupViews(resolve(__dirname, 'views'));

  server.route({
    path: '/bundles/app/{id}/bootstrap.js',
    method: 'GET',
    config: { auth: false },
    async handler(request, reply) {
      try {
        const { id } = request.params;
        const app = server.getUiAppById(id) || server.getHiddenUiAppById(id);
        if (!app) {
          throw Boom.notFound(`Unknown app: ${id}`);
        }

        const basePath = config.get('server.basePath');
        const bundlePath = `${basePath}/bundles`;
        const styleSheetPaths = [
          `${bundlePath}/vendors.style.css`,
          `${bundlePath}/commons.style.css`,
          `${bundlePath}/${app.getId()}.style.css`,
        ].concat(kbnServer.uiExports.styleSheetPaths.map(path => `${basePath}/${path.publicPath}`).reverse());

        const bootstrap = new AppBootstrap({
          templateData: {
            appId: app.getId(),
            bundlePath,
            styleSheetPaths,
          }
        });

        const body = await bootstrap.getJsFile();
        const etag = await bootstrap.getJsFileHash();

        reply(body)
          .header('cache-control', 'must-revalidate')
          .header('content-type', 'application/javascript')
          .etag(etag);
      } catch (err) {
        reply(err);
      }
    }
  });

  server.route({
    path: '/app/{id}',
    method: 'GET',
    async handler(req, reply) {
      const id = req.params.id;
      const app = server.getUiAppById(id);
      if (!app) return reply(Boom.notFound('Unknown app ' + id));

      try {
        if (kbnServer.status.isGreen()) {
          await reply.renderApp(app);
        } else {
          await reply.renderStatusPage();
        }
      } catch (err) {
        reply(Boom.wrap(err));
      }
    }
  });

  async function getLegacyKibanaPayload({ app, translations, request, includeUserProvidedConfig }) {
    const uiSettings = request.getUiSettingsService();

    return {
      app,
      translations,
      bundleId: `app:${app.getId()}`,
      nav: server.getUiNavLinks(),
      version: kbnServer.version,
      branch: config.get('pkg.branch'),
      buildNum: config.get('pkg.buildNum'),
      buildSha: config.get('pkg.buildSha'),
      basePath: request.getBasePath(),
      serverName: config.get('server.name'),
      devMode: config.get('env.dev'),
      uiSettings: await props({
        defaults: uiSettings.getDefaults(),
        user: includeUserProvidedConfig && uiSettings.getUserProvided()
      })
    };
  }

  async function renderApp({ app, reply, includeUserProvidedConfig = true, injectedVarsOverrides = {} }) {
    try {
      const request = reply.request;
      const translations = await server.getUiTranslations();
      const basePath = request.getBasePath();

      return reply.view('ui_app', {
        uiPublicUrl: `${basePath}/ui`,
        bootstrapScriptUrl: `${basePath}/bundles/app/${app.getId()}/bootstrap.js`,
        i18n: (id, options) => i18n.translate(id, options),

        injectedMetadata: {
          version: kbnServer.version,
          buildNumber: config.get('pkg.buildNum'),
          basePath,
          vars: await replaceInjectedVars(
            request,
            defaults(
              injectedVarsOverrides,
              await server.getInjectedUiAppVars(app.getId()),
              defaultInjectedVars,
            ),
          ),
          legacyMetadata: await getLegacyKibanaPayload({
            app,
            translations,
            request,
            includeUserProvidedConfig,
            injectedVarsOverrides
          }),
        },
      });
    } catch (err) {
      reply(err);
    }
  }

  server.decorate('reply', 'renderApp', function (app, injectedVarsOverrides) {
    return renderApp({
      app,
      reply: this,
      includeUserProvidedConfig: true,
      injectedVarsOverrides,
    });
  });

  server.decorate('reply', 'renderAppWithDefaultConfig', function (app) {
    return renderApp({
      app,
      reply: this,
      includeUserProvidedConfig: false,
    });
  });
}
