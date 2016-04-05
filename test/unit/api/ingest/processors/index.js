define(function (require) {
  var set = require('./_set');
  var gsub = require('./_gsub');

  return function processors(bdd, scenarioManager, request) {
    set(bdd, scenarioManager, request);
    gsub(bdd, scenarioManager, request);
  };

});

