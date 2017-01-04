import _ from 'lodash';
import IndexedArray from 'ui/indexed_array';
const notPropsOptNames = IndexedArray.OPT_NAMES.concat('constructor');

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
export default function createRegistry(spec) {
  spec = spec || {};

  const constructor = _.has(spec, 'constructor') && spec.constructor;
  const iaOpts = _.defaults(_.pick(spec, IndexedArray.OPT_NAMES), { index: ['name'] });
  const props = _.omit(spec, notPropsOptNames);
  const providers = [];

  /**
   * This is the Private module that will be instanciated by
   *
   * @tag:PrivateModule
   * @return {IndexedArray} - an indexed array containing the values
   *                          that were registered, the registry spec
   *                          defines how things will be indexed.
   */
  const registry = function (Private, $injector) {
    // index all of the modules
    iaOpts.initialSet = providers.map(Private);
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

