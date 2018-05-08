import { flatConcatAtType } from './reduce';
import { alias, mapSpec, wrap } from './modify_reduce';

function applySpecDefaults(spec, type, pluginSpec) {
  const pluginId = pluginSpec.getId();
  const {
    id = pluginId,
    main,
    title,
    order = 0,
    description = '',
    icon,
    hidden = false,
    linkToLastSubUrl = true,
    listed = !hidden,
    url = `/app/${id}`,
  } = spec;

  if (spec.injectVars) {
    throw new Error(`[plugin:${pluginId}] uiExports.app.injectVars has been removed. Use server.injectUiAppVars('${id}', () => { ... })`);
  }

  if (spec.uses) {
    throw new Error(
      `[plugin:${pluginId}] uiExports.app.uses has been removed. Import these uiExport types with "import 'uiExports/{type}'"`
    );
  }

  return {
    pluginId,
    id,
    main,
    title,
    order,
    description,
    icon,
    hidden,
    linkToLastSubUrl,
    listed,
    url,
  };
}

export const apps = wrap(alias('uiAppSpecs'), mapSpec(applySpecDefaults), flatConcatAtType);
export const app = wrap(alias('uiAppSpecs'), mapSpec(applySpecDefaults), flatConcatAtType);
