define(function (require) {
  let append = require('./_append');
  let convert = require('./_convert');
  let date = require('./_date');
  let geoip = require('./_geoip');
  let grok = require('./_grok');
  let gsub = require('./_gsub');
  let join = require('./_join');
  let lowercase = require('./_lowercase');
  let remove = require('./_remove');
  let rename = require('./_rename');
  let set = require('./_set');
  let split = require('./_split');
  let trim = require('./_trim');
  let uppercase = require('./_uppercase');

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
