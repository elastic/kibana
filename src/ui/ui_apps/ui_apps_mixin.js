import { UiApp } from './ui_app';

export function uiAppsMixin(kbnServer, server) {

  const { uiAppSpecs = [] } = kbnServer.uiExports;
  const existingIds = new Set();
  const appsById = new Map();
  const hiddenAppsById = new Map();

  kbnServer.uiApps = uiAppSpecs.map((spec) => {
    const app = new UiApp(kbnServer, spec);
    const id = app.getId();

    if (!existingIds.has(id)) {
      existingIds.add(id);
    } else {
      throw new Error(`Unable to create two apps with the id ${id}.`);
    }

    if (app.isHidden()) {
      hiddenAppsById.set(id, app);
    } else {
      appsById.set(id, app);
    }

    return app;
  });

  server.decorate('server', 'getAllUiApps', () => kbnServer.uiApps.slice(0));
  server.decorate('server', 'getUiAppById', id => appsById.get(id));
  server.decorate('server', 'getHiddenUiAppById', id => hiddenAppsById.get(id));

  const injectedVarProviders = [];
  server.decorate('server', 'injectUiAppVars', (appId, provider) => {
    injectedVarProviders.push({ appId, provider });
  });

  server.decorate('server', 'getInjectedUiAppVars', async (appId) => {
    return await injectedVarProviders
      .filter(p => p.appId === appId)
      .reduce(async (acc, { provider }) => ({
        ...await acc,
        ...await provider(server)
      }), {});
  });
}
