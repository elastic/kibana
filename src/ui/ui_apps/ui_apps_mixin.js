import { memoize } from 'lodash';

import { UiApp } from './ui_app';

export function uiAppsMixin(kbnServer, server) {

  const { uiAppSpecs = [] } = kbnServer.uiExports;
  const existingIds = new Set();

  kbnServer.uiApps = uiAppSpecs.map(spec => {
    const app = new UiApp(kbnServer, spec);
    const id = app.getId();

    if (!existingIds.has(id)) {
      existingIds.add(id);
    } else {
      throw new Error(`Unable to create two apps with the id ${id}.`);
    }

    return app;
  });

  server.decorate('server', 'getAllUiApps', () => (
    kbnServer.uiApps.slice(0)
  ));

  server.decorate('server', 'getUiAppById', memoize(id => (
    kbnServer.uiApps.find(uiApp => (
      uiApp.getId() === id && !uiApp.isHidden()
    ))
  )));

  server.decorate('server', 'getHiddenUiAppById', memoize(id => (
    kbnServer.uiApps.find(uiApp => (
      uiApp.getId() === id && uiApp.isHidden()
    ))
  )));
}
