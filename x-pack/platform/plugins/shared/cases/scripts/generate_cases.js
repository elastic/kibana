/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const http = require('http');
const pMap = require('p-map');
const yargs = require('yargs');

const username = 'elastic';
const password = 'changeme';

const makeRequest = async ({ options, data }) => {
  return new Promise((resolve, reject) => {
    const reqData = JSON.stringify(data);
    const reqOptions = {
      ...options,
      rejectUnauthorized: false,
      requestCert: true,
      agent: false,
      headers: {
        ...options.headers,
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Content-Length': reqData.length,
        'kbn-xsrf': 'true',
      },
    };

    const req = http.request(reqOptions, (res) => {
      const body = [];

      res.on('data', (chunk) => body.push(chunk));
      res.on('end', () => {
        const resString = Buffer.concat(body).toString();
        try {
          if (resString != null && resString.length > 0) {
            const res = JSON.parse(resString);
            if (res.statusCode && res.statusCode === 400) {
              reject(new Error(res.message));
            }
          }
        } catch (error) {
          reject(error);
        }
        resolve(resString);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request time out'));
    });

    req.write(reqData);
    req.end();
  });
};

const getHostAndPort = () => ({
  host: '127.0.0.1',
  port: 5601,
});

const createCase = (counter, owner) => ({
  title: `Sample Case ${counter}`,
  tags: [],
  severity: 'low',
  description: `Auto generated case ${counter}`,
  assignees: [],
  connector: {
    id: 'none',
    name: 'none',
    type: '.none',
    fields: null,
  },
  settings: {
    syncAlerts: false,
  },
  owner: owner ?? 'cases',
  customFields: [],
});

const generateCases = async (cases, space) => {
  try {
    console.log(`Creating ${cases.length} cases in ${space ? `space: ${space}` : 'default space'}`);
    const path = space ? `/s/${space}/api/cases` : '/api/cases';
    await pMap(
      cases,
      (theCase) => {
        const options = {
          ...getHostAndPort(),
          path,
          method: 'POST',
        };

        return makeRequest({ options, data: theCase });
      },
      { concurrency: 100 }
    );
  } catch (error) {
    console.log(error);
  }
};

const main = async () => {
  try {
    const argv = yargs.help().options({
      count: {
        alias: 'c',
        describe: 'number of cases to generate',
        type: 'number',
        default: 10,
      },
      owners: {
        alias: 'o',
        describe:
          'solutions where the cases should be created. combination of securitySolution, observability, or cases',
        default: 'cases',
        type: 'array',
      },
      space: {
        alias: 's',
        describe: 'space where the cases should be created',
        default: '',
        type: 'string',
      },
    }).argv;

    const { count, owners, space } = argv;
    const numCasesToCreate = Number(count);
    const potentialOwners = new Set(['securitySolution', 'observability', 'cases']);

    const invalidOwnerProvided = owners.some((owner) => !potentialOwners.has(owner));

    if (invalidOwnerProvided) {
      console.error('Only valid owners are securitySolution, observability, and cases');
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }

    const cases = Array(numCasesToCreate)
      .fill(null)
      .map((_, index) => {
        const owner = owners[Math.floor(Math.random() * owners.length)];
        return createCase(index + 1, owner);
      });

    await generateCases(cases, space);
  } catch (error) {
    console.log(error);
  }
};

main();

process.on('uncaughtException', function (err) {
  console.log(err);
});
