import { UiNavLink } from './ui_nav_link';

export function uiNavLinksMixin(kbnServer, server, config) {
  const uiApps = server.getAllUiApps();

  const { navLinkSpecs = [] } = kbnServer.uiExports;
  const urlBasePath = config.get('server.basePath');

  const fromSpecs = navLinkSpecs
    .map(navLinkSpec => new UiNavLink(urlBasePath, navLinkSpec));

  const fromApps = uiApps
    .map(app => app.getNavLink())
    .filter(Boolean);

  const uiNavLinks = fromSpecs
    .concat(fromApps)
    .sort((a, b) => a.getOrder() - b.getOrder());

  server.decorate('server', 'getUiNavLinks', () => (
    uiNavLinks.slice(0)
  ));
}
