define(function (require) {
  const angular = require('angular');
  const existingModules = {};
  const _ = require('lodash');
  const links = [];

  function link(module) {
    // as modules are defined they will be set as requirements for this app
    links.push(module);

    // merge in the existing modules
    module.requires = _.union(module.requires, _.keys(existingModules));
  }

  function get(moduleName, requires) {
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

  function close(moduleName) {
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

  return {
    link: link,
    get: get,
    close: close
  };
});
