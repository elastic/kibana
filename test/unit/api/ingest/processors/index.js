const append = require('./_append');
const convert = require('./_convert');
const date = require('./_date');
const geoip = require('./_geoip');
const grok = require('./_grok');
const gsub = require('./_gsub');
const join = require('./_join');
const lowercase = require('./_lowercase');
const remove = require('./_remove');
const rename = require('./_rename');
const set = require('./_set');
const split = require('./_split');
const trim = require('./_trim');
const uppercase = require('./_uppercase');

export default function processors(bdd, scenarioManager, request) {
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
}
