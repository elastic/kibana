import _ from 'lodash';
import { IndexedArray } from 'ui/indexed_array';
const notPropsOptNames = IndexedArray.OPT_NAMES.concat('constructor', 'invokeProviders');

/**
 * Create a registry, which is just a Private module provider.
 *
 * The registry allows modifying the values it will provide
 * using the #register method.
 *
 * To access these modules, pass the registry to the Private
 * module loader.
 *
 * # Examples
 *
 * + register a module
 * ```js
 * let registry = require('ui/registry/vis_types');
 * registry.add(function InjectablePrivateModule($http, Promise) {
 *   ...
 * })
 * ```
 *
 * + get all registered modules
 * ```js
 * let visTypes = Private(RegistryVisTypesProvider);
 * ```
 *
 *
 * @param  {object} [spec] - an object describing the properties of
 *                         the registry to create. Any property specified
 *                         that is not listed below will be mixed into the
 *                         final IndexedArray object.
 *
 * # init
 * @param {Function} [spec.constructor] - an injectable function that is called when
 *                                      the registry is first instanciated by the app.
 * @param {boolean} [spec.filter] - function that will be used to filter items before
 *                                registering them. Function will called on each item and
 *                                should return true to keep the item (register it) or
 *                                skip it (don't register it)
 *
 * # IndexedArray params
 * @param {array[String]} [spec.index] - passed to the IndexedArray constructor
 * @param {array[String]} [spec.group] - passed to the IndexedArray constructor
 * @param {array[String]} [spec.order] - passed to the IndexedArray constructor
 * @param {array[String]} [spec.initialSet] - passed to the IndexedArray constructor
 * @param {array[String]} [spec.immutable] - passed to the IndexedArray constructor
 *
 * @return {[type]}      [description]
 */
export function uiRegistry(spec) {
  spec = spec || {};

  const constructor = _.has(spec, 'constructor') && spec.constructor;
  const filter = _.has(spec, 'filter') && spec.filter;
  const invokeProviders = _.has(spec, 'invokeProviders') && spec.invokeProviders;
  const iaOpts = _.defaults(_.pick(spec, IndexedArray.OPT_NAMES), { index: ['name'] });
  const props = _.omit(spec, notPropsOptNames);
  const providers = [];

  /**
   * This is the Private module that will be instantiated by
   *
   * @tag:PrivateModule
   * @return {IndexedArray} - an indexed array containing the values
   *                          that were registered, the registry spec
   *                          defines how things will be indexed.
   */
  const registry = function (Private, $injector) {
    // call the registered providers to get their values
    iaOpts.initialSet = invokeProviders
      ? $injector.invoke(invokeProviders, undefined, { providers })
      : providers.map(Private);

    if (filter && _.isFunction(filter)) {
      iaOpts.initialSet = iaOpts.initialSet.filter(item => filter(item));
    }

    // index all of the modules
    let modules = new IndexedArray(iaOpts);

    // mixin other props
    _.assign(modules, props);

    // construct
    if (constructor) {
      modules = $injector.invoke(constructor, modules) || modules;
    }

    return modules;
  };

  registry.displayName = '[registry ' + props.name + ']';

  registry.register = function (privateModule) {
    providers.push(privateModule);
    return registry;
  };

  return registry;
}
