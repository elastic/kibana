import { mapSpec } from './map_spec';

/**
 *  Reducer wrapper which, replaces the `spec` with the details about the definition
 *  of that spec
 *  @type {Function}
 */
export const debug = mapSpec((spec, type, pluginSpec) => ({
  spec,
  type,
  pluginSpec
}));
