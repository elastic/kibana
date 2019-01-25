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

import { props, reduce as reduceAsync } from 'bluebird';
import Boom from 'boom';
import { resolve } from 'path';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { AppBootstrap } from './bootstrap';
import { mergeVariables } from './lib';
import { fromRoot } from '../../utils';

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
        mergeVariables(
          allDefaults,
          fn(kbnServer.server, pluginSpec.readConfigValue(kbnServer.config, []))
        )
      ), {});
  });

  // render all views from ./views
  server.setupViews(resolve(__dirname, 'views'));

  // expose built css
  server.exposeStaticDir('/built_assets/css/{path*}', fromRoot('built_assets/css'));
  server.exposeStaticDir('/node_modules/@elastic/eui/dist/{path*}', fromRoot('node_modules/@elastic/eui/dist'));
  server.exposeStaticDir('/node_modules/@kbn/ui-framework/dist/{path*}', fromRoot('node_modules/@kbn/ui-framework/dist'));

  // register the bootstrap.js route after plugins are initialized so that we can
  // detect if any default auth strategies were registered
  kbnServer.afterPluginsInit(() => {
    const authEnabled = !!server.auth.settings.default;

    server.route({
      path: '/bundles/app/{id}/bootstrap.js',
      method: 'GET',
      config: {
        tags: ['api'],
        auth: authEnabled ? { mode: 'try' } : false,
      },
      async handler(request, h) {
        const { id } = request.params;
        const app = server.getUiAppById(id) || server.getHiddenUiAppById(id);
        if (!app) {
          throw Boom.notFound(`Unknown app: ${id}`);
        }

        const uiSettings = request.getUiSettingsService();
        const darkMode = !authEnabled || request.auth.isAuthenticated
          ? await uiSettings.get('theme:darkMode')
          : false;

        const basePath = config.get('server.basePath');
        const regularBundlePath = `${basePath}/bundles`;
        const dllBundlePath = `${basePath}/built_assets/dlls`;
        const styleSheetPaths = [
          `${dllBundlePath}/vendors.style.dll.css`,
          ...(
            darkMode ?
              [
                `${basePath}/node_modules/@elastic/eui/dist/eui_theme_k6_dark.css`,
                `${basePath}/node_modules/@kbn/ui-framework/dist/kui_dark.css`,
              ] : [
                `${basePath}/node_modules/@elastic/eui/dist/eui_theme_k6_light.css`,
                `${basePath}/node_modules/@kbn/ui-framework/dist/kui_light.css`,
              ]
          ),
          `${regularBundlePath}/${darkMode ? 'dark' : 'light'}_theme.style.css`,
          `${regularBundlePath}/commons.style.css`,
          `${regularBundlePath}/${app.getId()}.style.css`,
          ...kbnServer.uiExports.styleSheetPaths
            .filter(path => (
              path.theme === '*' || path.theme === (darkMode ? 'dark' : 'light')
            ))
            .map(path => (
              path.localPath.endsWith('.scss')
                ? `${basePath}/built_assets/css/${path.publicPath}`
                : `${basePath}/${path.publicPath}`
            ))
            .reverse()
        ];

        const bootstrap = new AppBootstrap({
          templateData: {
            appId: app.getId(),
            regularBundlePath,
            dllBundlePath,
            styleSheetPaths,
          }
        });

        const body = await bootstrap.getJsFile();
        const etag = await bootstrap.getJsFileHash();

        return h.response(body)
          .header('cache-control', 'must-revalidate')
          .header('content-type', 'application/javascript')
          .etag(etag);
      }
    });
  });

  server.route({
    path: '/app/{id}',
    method: 'GET',
    async handler(req, h) {
      const id = req.params.id;
      const app = server.getUiAppById(id);
      if (!app) throw Boom.notFound('Unknown app ' + id);

      try {
        if (kbnServer.status.isGreen()) {
          return await h.renderApp(app);
        } else {
          return await h.renderStatusPage();
        }
      } catch (err) {
        throw Boom.boomify(err);
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

  async function renderApp({ app, h, includeUserProvidedConfig = true, injectedVarsOverrides = {} }) {
    const request = h.request;
    const translations = await server.getUiTranslations();
    const basePath = request.getBasePath();

    const legacyMetadata = await getLegacyKibanaPayload({
      app,
      translations,
      request,
      includeUserProvidedConfig,
      injectedVarsOverrides
    });

    return h.view('ui_app', {
      uiPublicUrl: `${basePath}/ui`,
      bootstrapScriptUrl: `${basePath}/bundles/app/${app.getId()}/bootstrap.js`,
      i18n: (id, options) => i18n.translate(id, options),
      locale: i18n.getLocale(),
      darkMode: get(legacyMetadata.uiSettings.user, ['theme:darkMode', 'userValue'], false),

      injectedMetadata: {
        version: kbnServer.version,
        buildNumber: config.get('pkg.buildNum'),
        basePath,
        vars: await replaceInjectedVars(
          request,
          mergeVariables(
            injectedVarsOverrides,
            await server.getInjectedUiAppVars(app.getId()),
            defaultInjectedVars,
          ),
        ),

        legacyMetadata,
      },
    });
  }

  server.decorate('toolkit', 'renderApp', function (app, injectedVarsOverrides) {
    return renderApp({
      app,
      h: this,
      includeUserProvidedConfig: true,
      injectedVarsOverrides,
    });
  });

  server.decorate('toolkit', 'renderAppWithDefaultConfig', function (app) {
    return renderApp({
      app,
      h: this,
      includeUserProvidedConfig: false,
    });
  });
}
