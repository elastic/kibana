import { UI_EXPORT_DEFAULTS } from './ui_export_defaults';
import * as uiExportTypeReducers from './ui_export_types';
import { reduceExportSpecs } from '../../plugin_discovery';

export function collectUiExports(pluginSpecs) {
  return reduceExportSpecs(
    pluginSpecs,
    uiExportTypeReducers,
    UI_EXPORT_DEFAULTS
  );
}
