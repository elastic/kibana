import { UiBundlesController } from './ui_bundles_controller';

export async function uiBundlesMixin(kbnServer) {
  kbnServer.uiBundles = new UiBundlesController(kbnServer);

  const { uiBundleProviders = [] } = kbnServer.uiExports;
  for (const spec of uiBundleProviders) {
    await spec(kbnServer);
  }
}
