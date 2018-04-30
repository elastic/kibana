import { UiNavLink } from './ui_nav_link';

export function uiNavLinksMixin(kbnServer, server) {
  const uiApps = server.getAllUiApps();

  const { navLinkSpecs = [] } = kbnServer.uiExports;

  const fromSpecs = navLinkSpecs
    .map(navLinkSpec => new UiNavLink(navLinkSpec));

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
