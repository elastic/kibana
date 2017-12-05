import { flatConcatAtType } from './reduce';
import { wrap, alias, mapSpec } from './modify_reduce';

export const replaceInjectedVars = wrap(alias('injectedVarsReplacers'), flatConcatAtType);

export const injectDefaultVars = wrap(
  alias('defaultInjectedVarProviders'),
  mapSpec((spec, type, pluginSpec) => ({
    pluginSpec,
    fn: spec,
  })),
  flatConcatAtType
);
