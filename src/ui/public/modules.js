import angular from 'angular';
import _ from 'lodash';
/**
 * This module is used by Kibana to create and reuse angular modules. Angular modules
 * can only be created once and need to have their dependencies at creation. This is
 * hard/impossible to do in require.js since all of the dependencies for a module are
 * loaded before it is.
 *
 * Here is an example:
 *
 * 	In the scenario below, require.js would load directive.js first because it is a
 * 	dependency of app.js. This would cause the call to `angular.module('app')` to
 * 	execute before the module is actually created. This causes angular to throw an
 * 	error. This effect is magnified when app.js links off to many different modules.
 *
 * 	This is normally solved by creating unique modules per file, listed as the 1st
 * 	alternate solution below. Unfortunately this solution would have required that
 * 	we replicate our require statements.
 *
 *  	app.js
 *      ```
 *      angular.module('app', ['ui.bootstrap'])
 *      .controller('AppController', function () { ... });
 *
 *      require('./directive');
 *      ```
 *
 *    directive.js
 *      ```
 *      angular.module('app')
 *      .directive('someDirective', function () { ... });
 *      ```
 *
 * Before taking this approach we saw three possible solutions:
 *   1. replicate our js modules in angular modules/use a different module per file
 *   2. create a single module outside of our js modules and share it
 *   3. use a helper lib to dynamically create modules as needed.
 *
 * We decided to go with #3
 *
 * This ends up working by creating a list of modules that the code base creates by
 * calling `modules.get(name)` with different names, and then before bootstrapping
 * the application kibana uses `modules.link()` to set the dependencies of the "kibana"
 * module to include every defined module. This guarantees that kibana can always find
 * any angular dependecy defined in the kibana code base. This **also** means that
 * Private modules are able to find any dependency, since they are injected using the
 * "kibana" module's injector.
 *
 */
const existingModules = {};
const links = [];

/**
 * Take an angular module and extends the dependencies for that module to include all of the modules
 * created using `ui/modules`
 *
 * @param  {AngularModule} module - the module to extend
 * @return {undefined}
 */
export function link(module) {
  // as modules are defined they will be set as requirements for this app
  links.push(module);

  // merge in the existing modules
  module.requires = _.union(module.requires, _.keys(existingModules));
}

/**
 * The primary means of interacting with `ui/modules`. Returns an angular module. If the module already
 * exists the existing version will be returned. `dependencies` are either set as or merged into the
 * modules total dependencies.
 *
 * This is in contrast to the `angular.module(name, [dependencies])` function which will only
 * create a module if the `dependencies` list is passed and get an existing module if no dependencies
 * are passed. This requires knowing the order that your files will load, which we can't guarantee.
 *
 * @param  {string} moduleName - the unique name for this module
 * @param  {array[string]} [requires=[]] - the other modules this module requires
 * @return {AngularModule}
 */
export function get(moduleName, requires) {
  let module = existingModules[moduleName];

  if (module === void 0) {
    // create the module
    module = existingModules[moduleName] = angular.module(moduleName, []);

    module.close = _.partial(close, moduleName);

    // ensure that it is required by linked modules
    _.each(links, function (app) {
      if (!~app.requires.indexOf(moduleName)) app.requires.push(moduleName);
    });
  }

  if (requires) {
    // update requires list with possibly new requirements
    module.requires = _.union(module.requires, requires);
  }

  return module;
}

export function close(moduleName) {
  const module = existingModules[moduleName];

  // already closed
  if (!module) return;

  // if the module is currently linked, unlink it
  const i = links.indexOf(module);
  if (i > -1) links.splice(i, 1);

  // remove from linked modules list of required modules
  _.each(links, function (app) {
    _.pull(app.requires, moduleName);
  });

  // remove module from existingModules
  delete existingModules[moduleName];
}

export default { link, get, close };
