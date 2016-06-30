define(function (require) {
  var append = require('./_append');
  var convert = require('./_convert');
  var date = require('./_date');
  var geoip = require('./_geoip');
  var grok = require('./_grok');
  var gsub = require('./_gsub');
  var join = require('./_join');
  var lowercase = require('./_lowercase');
  var remove = require('./_remove');
  var rename = require('./_rename');
  var set = require('./_set');
  var split = require('./_split');
  var trim = require('./_trim');
  var uppercase = require('./_uppercase');

  return function processors(bdd, scenarioManager, request) {
    append(bdd, scenarioManager, request);
    convert(bdd, scenarioManager, request);
    date(bdd, scenarioManager, request);
    geoip(bdd, scenarioManager, request);
    grok(bdd, scenarioManager, request);
    gsub(bdd, scenarioManager, request);
    join(bdd, scenarioManager, request);
    lowercase(bdd, scenarioManager, request);
    remove(bdd, scenarioManager, request);
    rename(bdd, scenarioManager, request);
    set(bdd, scenarioManager, request);
    split(bdd, scenarioManager, request);
    trim(bdd, scenarioManager, request);
    uppercase(bdd, scenarioManager, request);
  };

});
