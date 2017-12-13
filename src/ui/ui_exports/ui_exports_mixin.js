import { collectUiExports } from './collect_ui_exports';

export function uiExportsMixin(kbnServer) {
  kbnServer.uiExports = collectUiExports(
    kbnServer.pluginSpecs
  );

  // check for unknown uiExport types
  const { unknown = [] } = kbnServer.uiExports;
  if (!unknown.length) {
    return;
  }

  throw new Error(`Unknown uiExport types: ${
    unknown
      .map(({ pluginSpec, type }) => `${type} from ${pluginSpec.getId()}`)
      .join(', ')
  }`);
}
