import append from './_append';
import convert from './_convert';
import date from './_date';
import geoip from './_geoip';
import grok from './_grok';
import gsub from './_gsub';
import join from './_join';
import lowercase from './_lowercase';
import remove from './_remove';
import rename from './_rename';
import set from './_set';
import split from './_split';
import trim from './_trim';
import uppercase from './_uppercase';

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
