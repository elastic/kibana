import { noop, uniq } from 'lodash';

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
    templateName = 'ui_app',
    injectVars = noop,
    url = `/app/${id}`,
    uses = [],
  } = spec;

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
    templateName,
    injectVars,
    url,
    uses: uniq([
      ...uses,
      'chromeNavControls',
      'hacks',
    ]),
  };
}

export const apps = wrap(alias('uiAppSpecs'), mapSpec(applySpecDefaults), flatConcatAtType);
export const app = wrap(alias('uiAppSpecs'), mapSpec(applySpecDefaults), flatConcatAtType);
