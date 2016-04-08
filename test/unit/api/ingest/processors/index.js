define(function (require) {
  var convert = require('./_convert');
  var set = require('./_set');
  var gsub = require('./_gsub');
  var append = require('./_append');

  return function processors(bdd, scenarioManager, request) {
    convert(bdd, scenarioManager, request);
    set(bdd, scenarioManager, request);
    gsub(bdd, scenarioManager, request);
    append(bdd, scenarioManager, request);
  };

});

