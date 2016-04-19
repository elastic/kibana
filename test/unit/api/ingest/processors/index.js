define(function (require) {
  var append = require('./_append');
  var convert = require('./_convert');
  var date = require('./_date');
  var geoip = require('./_geoip');
  var grok = require('./_grok');
  var gsub = require('./_gsub');
  var join = require('./_join');
  var set = require('./_set');

  return function processors(bdd, scenarioManager, request) {
    append(bdd, scenarioManager, request);
    convert(bdd, scenarioManager, request);
    date(bdd, scenarioManager, request);
    geoip(bdd, scenarioManager, request);
    grok(bdd, scenarioManager, request);
    gsub(bdd, scenarioManager, request);
    join(bdd, scenarioManager, request);
    set(bdd, scenarioManager, request);
  };

});
