/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('../../../../../src/setup_node_env');

const fs = require('fs');
const path = require('path');

/*
 * This script is used to parse a set of saved searches on a file system
 * and output signal data compatible json files.
 * Example:
 * node saved_query_to_signals.js ${HOME}/saved_searches ${HOME}/saved_signals
 *
 * After editing any changes in the files of ${HOME}/saved_signals/*.json
 * you can then post the signals with a CURL post script such as:
 *
 * ./post_signal.sh ${HOME}/saved_signals/*.json
 *
 * Note: This script is recursive and but does not preserve folder structure
 * when it outputs the saved signals.
 */

// Defaults of the outputted signals since the saved KQL searches do not have
// this type of information. You usually will want to make any hand edits after
// doing a search to KQL conversion before posting it as a signal or checking it
// into another repository.
const INTERVAL = '24h';
const SEVERITY = 'low';
const TYPE = 'kql';
const FROM = 'now-24h';
const TO = 'now';
const INDEX = ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'];

const walk = dir => {
  const list = fs.readdirSync(dir);
  return list.reduce((accum, file) => {
    const fileWithDir = dir + '/' + file;
    const stat = fs.statSync(fileWithDir);
    if (stat && stat.isDirectory()) {
      return [...accum, ...walk(fileWithDir)];
    } else {
      return [...accum, fileWithDir];
    }
  }, []);
};

//clean up the file system characters
const cleanupFileName = file => {
  return path
    .basename(file, path.extname(file))
    .replace(/\s+/g, '_')
    .replace(/,/g, '')
    .replace(/\+s/g, '')
    .replace(/-/g, '')
    .replace(/__/g, '_')
    .toLowerCase();
};

async function main() {
  if (process.argv.length !== 4) {
    throw new Error(
      'usage: saved_query_to_signals [input directory with saved searches] [output directory]'
    );
  }

  const files = process.argv[2];
  const outputDir = process.argv[3];

  const savedSearchesJson = walk(files).filter(file => file.endsWith('.ndjson'));

  const savedSearchesParsed = savedSearchesJson.reduce((accum, json) => {
    const jsonFile = fs.readFileSync(json, 'utf8');
    try {
      const parsedFile = JSON.parse(jsonFile);
      parsedFile._file = json;
      parsedFile.attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.parse(
        parsedFile.attributes.kibanaSavedObjectMeta.searchSourceJSON
      );
      return [...accum, parsedFile];
    } catch (err) {
      return accum;
    }
  }, []);

  savedSearchesParsed.forEach(savedSearch => {
    const fileToWrite = cleanupFileName(savedSearch._file);

    const query = savedSearch.attributes.kibanaSavedObjectMeta.searchSourceJSON.query.query;
    if (query != null && query.trim() !== '') {
      const outputMessage = {
        id: fileToWrite,
        description: savedSearch.attributes.description || savedSearch.attributes.title,
        index: INDEX,
        interval: INTERVAL,
        name: savedSearch.attributes.title,
        severity: SEVERITY,
        type: TYPE,
        from: FROM,
        to: TO,
        kql: savedSearch.attributes.kibanaSavedObjectMeta.searchSourceJSON.query.query,
      };

      fs.writeFileSync(`${outputDir}/${fileToWrite}.json`, JSON.stringify(outputMessage, null, 2));
    }
  });
}

if (require.main === module) {
  main();
}
