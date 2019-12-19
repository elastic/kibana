/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

require('../../../../../src/setup_node_env');

const fs = require('fs');
// eslint-disable-next-line import/no-extraneous-dependencies
const fetch = require('node-fetch');
const { camelCase } = require('lodash');
const { resolve } = require('path');

const OUTPUT_DIRECTORY = resolve('public', 'pages', 'detection_engine', 'mitre');
const MITRE_ENTREPRISE_ATTACK_URL =
  'https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json';

const getTacticsOptions = tactics =>
  tactics.map(t =>
    `{
  id: '${t.id}',
  name: '${t.name}',
  reference: '${t.reference}',
  text: i18n.translate(
    'xpack.siem.detectionEngine.mitreAttackTactics.${camelCase(t.name)}Description', {
      defaultMessage: '${t.name} (${t.id})'
  }),
  value: '${camelCase(t.name)}'
}`.replace(/(\r\n|\n|\r)/gm, ' ')
  );

const getTechniquesOptions = techniques =>
  techniques.map(t =>
    `{
  label: i18n.translate(
    'xpack.siem.detectionEngine.mitreAttackTechniques.${camelCase(t.name)}Description', {
      defaultMessage: '${t.name} (${t.id})'
  }),
  id: '${t.id}',
  name: '${t.name}',
  reference: '${t.reference}',
  tactics: '${t.tactics.join()}',
  value: '${camelCase(t.name)}'
}`.replace(/(\r\n|\n|\r)/gm, ' ')
  );

const getIdReference = references =>
  references.reduce(
    (obj, extRef) => {
      if (extRef.source_name === 'mitre-attack') {
        return {
          id: extRef.external_id,
          reference: extRef.url,
        };
      }
      return obj;
    },
    { id: '', reference: '' }
  );

async function main() {
  fetch(MITRE_ENTREPRISE_ATTACK_URL)
    .then(res => res.json())
    .then(json => {
      const mitreData = json.objects;
      const tactics = mitreData
        .filter(obj => obj.type === 'x-mitre-tactic')
        .reduce((acc, item) => {
          const { id, reference } = getIdReference(item.external_references);

          return [
            ...acc,
            {
              name: item.name,
              id,
              reference,
            },
          ];
        }, []);
      const techniques = mitreData
        .filter(obj => obj.type === 'attack-pattern')
        .reduce((acc, item) => {
          let tactics = [];
          const { id, reference } = getIdReference(item.external_references);
          if (item.kill_chain_phases != null && item.kill_chain_phases.length > 0) {
            item.kill_chain_phases.forEach(tactic => {
              tactics = [...tactics, tactic.phase_name];
            });
          }

          return [
            ...acc,
            {
              name: item.name,
              id,
              reference,
              tactics,
            },
          ];
        }, []);

      const body = `/*
          * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
          * or more contributor license agreements. Licensed under the Elastic License;
          * you may not use this file except in compliance with the Elastic License.
          */

          import { i18n } from '@kbn/i18n';

          import { MitreTacticsOptions, MitreTechniquesOptions } from './types';

          export const tactics = ${JSON.stringify(tactics, null, 2)};

          export const tacticsOptions: MitreTacticsOptions[] =
            ${JSON.stringify(getTacticsOptions(tactics), null, 2)
              .replace(/}"/g, '}')
              .replace(/"{/g, '{')};

          export const techniques = ${JSON.stringify(techniques, null, 2)};

          export const techniquesOptions: MitreTechniquesOptions[] =
            ${JSON.stringify(getTechniquesOptions(techniques), null, 2)
              .replace(/}"/g, '}')
              .replace(/"{/g, '{')};
      `;

      fs.writeFileSync(`${OUTPUT_DIRECTORY}/mitre_tactics_techniques.ts`, body, 'utf-8');
    });
}

if (require.main === module) {
  main();
}
