import { flatConcatAtType } from './reduce';
import { alias, mapSpec, wrap } from './modify_reduce';

// mapping types
export const mappings = wrap(
  alias('savedObjectMappings'),
  mapSpec((spec, type, pluginSpec) => ({
    pluginId: pluginSpec.getId(),
    properties: spec
  })),
  flatConcatAtType
);
