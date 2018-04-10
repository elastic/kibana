import { defaults, get } from 'lodash';
import { props, reduce as reduceAsync } from 'bluebird';
import Boom from 'boom';
import { resolve } from 'path';
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

        const bootstrap = new AppBootstrap({
          templateData: {
            appId: app.getId(),
            bundlePath: `${config.get('server.basePath')}/bundles`
          },
          translations: await request.getUiTranslations()
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

  async function getKibanaPayload({ app, request, includeUserProvidedConfig, injectedVarsOverrides }) {
    const uiSettings = request.getUiSettingsService();
    const translations = await request.getUiTranslations();

    return {
      app: app,
      bundleId: `app:${app.getId()}`,
      nav: server.getUiNavLinks(),
      version: kbnServer.version,
      branch: config.get('pkg.branch'),
      buildNum: config.get('pkg.buildNum'),
      buildSha: config.get('pkg.buildSha'),
      basePath: config.get('server.basePath'),
      serverName: config.get('server.name'),
      devMode: config.get('env.dev'),
      translations: translations,
      uiSettings: await props({
        defaults: uiSettings.getDefaults(),
        user: includeUserProvidedConfig && uiSettings.getUserProvided()
      }),
      vars: await replaceInjectedVars(
        request,
        defaults(
          injectedVarsOverrides,
          await server.getInjectedUiAppVars(app.getId()),
          defaultInjectedVars,
        ),
      )
    };
  }

  async function renderApp({ app, reply, includeUserProvidedConfig = true, injectedVarsOverrides = {} }) {
    try {
      const request = reply.request;
      const translations = await request.getUiTranslations();

      return reply.view('ui_app', {
        app,
        kibanaPayload: await getKibanaPayload({
          app,
          request,
          includeUserProvidedConfig,
          injectedVarsOverrides
        }),
        bundlePath: `${config.get('server.basePath')}/bundles`,
        i18n: key => get(translations, key, ''),
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
