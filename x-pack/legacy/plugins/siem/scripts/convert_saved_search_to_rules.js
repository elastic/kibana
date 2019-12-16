/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('../../../../../src/setup_node_env');

const fs = require('fs');
const path = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const uuid = require('uuid');

/*
 * This script is used to parse a set of saved searches on a file system
 * and output rule data compatible json files.
 * Example:
 * node saved_query_to_rules.js ${HOME}/saved_searches ${HOME}/saved_rules
 *
 * After editing any changes in the files of ${HOME}/saved_rules/*.json
 * you can then post the rules with a CURL post script such as:
 *
 * ./post_rule.sh ${HOME}/saved_rules/*.json
 *
 * Note: This script is recursive and but does not preserve folder structure
 * when it outputs the saved rules.
 */

// Defaults of the outputted rules since the saved KQL searches do not have
// this type of information. You usually will want to make any hand edits after
// doing a search to KQL conversion before posting it as a rule or checking it
// into another repository.
const INTERVAL = '5m';
const SEVERITY = 'low';
const TYPE = 'query';
const FROM = 'now-6m';
const TO = 'now';
const IMMUTABLE = true;
const RISK_SCORE = 50;
const ENABLED = false;
let allRules = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Auto generated file from scripts/convert_saved_search_rules.js
// Do not hand edit. Run the script against a set of saved searches instead

`;
const allRulesNdJson = 'index.ts';

// For converting, if you want to use these instead of rely on the defaults then
// comment these in and use them for the script. Otherwise this is commented out
// so we can utilize the defaults of input and output which are based on saved objects
// of siem:defaultIndex and your kibana.dev.yml setting of xpack.siem.signalsIndex. If
// the setting of xpack.siem.signalsIndex is not set it defaults to .siem-signals
// const INDEX = ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'];
// const OUTPUT_INDEX = '.siem-signals-some-other-index';

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
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/\@/g, '')
    .replace(/\:/g, '')
    .replace(/\+s/g, '')
    .replace(/-/g, '')
    .replace(/__/g, '_')
    .toLowerCase();
};

async function main() {
  if (process.argv.length !== 4) {
    throw new Error(
      'usage: saved_query_to_rules [input directory with saved searches] [output directory]'
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
    const parsedLines = jsonLines.reduce((accum, line) => {
      try {
        const parsedLine = JSON.parse(line);
        // don't try to parse out any exported count records
        if (parsedLine.exportedCount != null) {
          return accum;
        }
        parsedLine._file = parsedLine.attributes.title;
        parsedLine.attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.parse(
          parsedLine.attributes.kibanaSavedObjectMeta.searchSourceJSON
        );
        return [...accum, parsedLine];
      } catch (err) {
        console.log('error parsing a line in this file:', json, line);
        return accum;
      }
    }, []);
    return [...accum, ...parsedLines];
  }, []);

  savedSearchesParsed.forEach(
    (
      {
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
      },
      index
    ) => {
      const fileToWrite = cleanupFileName(_file);

      const outputMessage = {
        rule_id: uuid.v4(),
        risk_score: RISK_SCORE,
        description: description || title,
        immutable: IMMUTABLE,
        interval: INTERVAL,
        name: title,
        severity: SEVERITY,
        type: TYPE,
        from: FROM,
        to: TO,
        query,
        language,
        filters: filter,
        enabled: ENABLED,
        // comment these in if you want to use these for input output, otherwise
        // with these two commented out, we will use the default saved objects from spaces.
        // index: INDEX,
        // output_index: OUTPUT_INDEX,
      };

      fs.writeFileSync(
        `${outputDir}/${fileToWrite}.json`,
        `${JSON.stringify(outputMessage, null, 2)}\n`
      );
      allRules += `import rule${index + 1} from './${fileToWrite}.json';\n`;
    }
  );
  allRules += '\n';
  allRules += 'export const rawRules = [\n';
  savedSearchesParsed.forEach((_, index) => {
    allRules += `  rule${index + 1},\n`;
  });
  allRules += '];\n';
  fs.writeFileSync(`${outputDir}/${allRulesNdJson}`, allRules);
}

if (require.main === module) {
  main();
}
