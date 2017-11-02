import { UiBundlesController } from './ui_bundles_controller';

export async function uiBundlesMixin(kbnServer) {
  kbnServer.uiBundles = new UiBundlesController(kbnServer);

  const { unknown = [] } = kbnServer.uiExports;
  for (const { type, spec } of unknown) {
    if (type === '__bundleProvider__') {
      await spec(kbnServer);
    }
  }
}
