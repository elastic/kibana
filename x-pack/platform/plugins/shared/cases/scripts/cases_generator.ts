/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
import { KbnClient } from '@kbn/test';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';
import type { KbnClientOptions } from '@kbn/test';
import fs from 'fs';
import pMap from 'p-map';
import yargs from 'yargs';
import { CaseSeverity, type CasePostRequest } from '../common';

const toolingLogger = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

function updateURL({
  url,
  user,
  protocol,
}: {
  url: string;
  user?: { username: string; password: string };
  protocol?: string;
}): string {
  const urlObject = new URL(url);
  if (user) {
    urlObject.username = user.username;
    urlObject.password = user.password;
  }
  if (protocol) {
    urlObject.protocol = protocol;
  }
  return urlObject.href;
}

const makeRequest = async ({
  url,
  newCase,
  path,
  username,
  password,
  ssl,
}: {
  url: string;
  newCase: CasePostRequest;
  path: string;
  username: string;
  password: string;
  ssl: boolean;
}) => {
  let ca: Buffer;
  const toolingLogOptions = { log: toolingLogger };

  let updatedUrl = updateURL({
    url,
    user: { username, password },
  });

  let kbnClientOptions: KbnClientOptions = {
    ...toolingLogOptions,
    url: updatedUrl,
  };

  if (ssl) {
    ca = fs.readFileSync(CA_CERT_PATH);
    updatedUrl = updateURL({
      url: updatedUrl,
      user: { username, password },
      protocol: 'https:',
    });
    kbnClientOptions = {
      ...kbnClientOptions,
      certificateAuthorities: [ca],
      url: updatedUrl,
    };
  }
  const kbnClient = new KbnClient({ ...kbnClientOptions });

  return kbnClient
    .request({
      method: 'POST',
      path,
      body: newCase,
    })
    .then(({ data }) => data)
    .catch(toolingLogger.error.bind(toolingLogger, `Error creating case: ${newCase.title}`));
};

const createCase = (counter: number, owner: string, reqId: string): CasePostRequest => ({
  title: `Sample Case: ${reqId} - ${counter}`,
  tags: [],
  severity: CaseSeverity.LOW,
  description: `Auto generated case ${counter}`,
  assignees: [],
  connector: {
    id: 'none',
    name: 'none',
    // @ts-ignore
    type: '.none',
    fields: null,
  },
  settings: {
    syncAlerts: false,
  },
  owner: owner ?? 'cases',
  customFields: [],
});

const getRandomString = (length: number) =>
  Math.random()
    .toString(36)
    .substring(2, length + 2);

const generateCases = async ({
  cases,
  space,
  username,
  password,
  kibana,
  ssl,
}: {
  cases: CasePostRequest[];
  space: string;
  username: string;
  password: string;
  kibana: string;
  ssl: boolean;
}) => {
  try {
    toolingLogger.info(
      `Creating ${cases.length} cases in ${space ? `space: ${space}` : 'default space'}`
    );
    const path = `${space ? `/s/${space}` : ''}/api/cases`;
    await pMap(
      cases,
      (newCase) => {
        return makeRequest({ url: kibana, path, newCase, username, password, ssl });
      },
      { concurrency: 100 }
    );
  } catch (error) {
    toolingLogger.error(error);
  }
};

const main = async () => {
  try {
    const argv = yargs.help().options({
      username: {
        alias: 'u',
        describe: 'username for kibana',
        type: 'string',
        default: 'elastic',
      },
      password: {
        alias: 'p',
        describe: 'password for kibana',
        type: 'string',
        default: 'changeme',
      },
      kibana: {
        alias: 'k',
        describe: 'kibana url',
        default: 'http://127.0.0.1:5601',
        type: 'string',
      },
      count: {
        alias: 'c',
        describe: 'Number of cases to generate',
        type: 'number',
        default: 10,
      },
      owners: {
        alias: 'o',
        describe:
          'solutions where the cases should be created. combination of securitySolution, observability, or cases',
        default: ['securitySolution', 'observability', 'cases'],
        type: 'array',
      },
      space: {
        alias: 's',
        describe: 'space where the cases should be created',
        default: '',
        type: 'string',
      },
      ssl: {
        alias: 'ssl',
        describe: 'Use https for non local environments',
        type: 'boolean',
        default: false,
      },
    }).argv;

    const { username, password, kibana, count, owners, space, ssl } = argv;
    const numCasesToCreate = Number(count);
    const potentialOwners = new Set(['securitySolution', 'observability', 'cases']);
    const invalidOwnerProvided = owners.some((owner) => !potentialOwners.has(owner));

    if (invalidOwnerProvided) {
      toolingLogger.error('Only valid owners are securitySolution, observability, and cases');
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }

    const idForThisRequest = getRandomString(6);

    const cases = Array(numCasesToCreate)
      .fill(null)
      .map((_, index) => {
        const owner = owners[Math.floor(Math.random() * owners.length)];
        return createCase(index + 1, owner, idForThisRequest);
      });

    await generateCases({ cases, space, username, password, kibana, ssl });
  } catch (error) {
    console.log(error);
  }
};

main();

process.on('uncaughtException', function (err) {
  console.log(err);
});
