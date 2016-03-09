define(function (require) {
  var set = require('./_set');

  return function processors(bdd, scenarioManager, request) {
    set(bdd, scenarioManager, request);
  };

});

