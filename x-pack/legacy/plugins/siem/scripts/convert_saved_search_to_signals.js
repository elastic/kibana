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
const INTERVAL = '5m';
const SEVERITY = 'low';
const TYPE = 'query';
const FROM = 'now-6m';
const TO = 'now';
const IMMUTABLE = true;
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

  const savedSearchesJson = walk(files).filter(file => {
    return !path.basename(file).startsWith('.') && file.endsWith('.ndjson');
  });

  const savedSearchesParsed = savedSearchesJson.reduce((accum, json) => {
    const jsonFile = fs.readFileSync(json, 'utf8');
    const jsonLines = jsonFile.split(/\r{0,1}\n/);
    const parsedLines = jsonLines.reduce((accum, line, index) => {
      try {
        const parsedLine = JSON.parse(line);
        if (index !== 0) {
          parsedLine._file = `${json.substring(0, json.length - '.ndjson'.length)}_${String(
            index
          )}.ndjson`;
        } else {
          parsedLine._file = json;
        }
        parsedLine.attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.parse(
          parsedLine.attributes.kibanaSavedObjectMeta.searchSourceJSON
        );
        return [...accum, parsedLine];
      } catch (err) {
        console.log('error parsing a line in this file:', json);
        return accum;
      }
    }, []);
    return [...accum, ...parsedLines];
  }, []);

  savedSearchesParsed.forEach(
    ({
      _file,
      attributes: {
        description,
        title,
        kibanaSavedObjectMeta: {
          searchSourceJSON: {
            query: { query, language },
            filter,
          },
        },
      },
    }) => {
      const fileToWrite = cleanupFileName(_file);

      if (query != null && query.trim() !== '') {
        const outputMessage = {
          rule_id: fileToWrite,
          description: description || title,
          immutable: IMMUTABLE,
          index: INDEX,
          interval: INTERVAL,
          name: title,
          severity: SEVERITY,
          type: TYPE,
          from: FROM,
          to: TO,
          query,
          language,
          filters: filter,
        };

        fs.writeFileSync(
          `${outputDir}/${fileToWrite}.json`,
          JSON.stringify(outputMessage, null, 2)
        );
      }
    }
  );
}

if (require.main === module) {
  main();
}
