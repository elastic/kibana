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

const createKbnClient = ({
  url,
  username,
  password,
  ssl,
  apiKey,
}: {
  url: string;
  username: string;
  password: string;
  ssl: boolean;
  apiKey?: string;
}): { kbnClient: KbnClient; headers: Record<string, string> } => {
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
    const ca = fs.readFileSync(CA_CERT_PATH);
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

  const kbnClient = new KbnClient(kbnClientOptions);
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers.Authorization = `ApiKey ${apiKey}`;
  }

  return { kbnClient, headers };
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
    extractObservables: false,
  },
  owner: owner ?? 'cases',
  customFields: [],
});

const createUserComment = (owner: string, index: number) => ({
  type: 'user' as const,
  comment: `Auto generated comment ${index + 1}`,
  owner,
});

const createAlertAttachment = (owner: string, index: number) => ({
  type: 'alert' as const,
  alertId: `sample-alert-${getRandomString(8)}-${index}`,
  index: '.internal.alerts-security.alerts-default-000001',
  rule: {
    id: `sample-rule-${getRandomString(6)}`,
    name: `Sample Rule ${index + 1}`,
  },
  owner,
});

const getRandomString = (length: number) =>
  Math.random()
    .toString(36)
    .substring(2, length + 2);

const generateCases = async ({
  cases,
  space,
  kbnClient,
  headers,
  commentsPerCase,
  alertsPerCase,
}: {
  cases: CasePostRequest[];
  space: string;
  kbnClient: KbnClient;
  headers: Record<string, string>;
  commentsPerCase: number;
  alertsPerCase: number;
}) => {
  try {
    const basePath = space ? `/s/${space}` : '';
    const casesPath = `${basePath}/api/cases`;
    const totalAttachments = commentsPerCase + alertsPerCase;

    toolingLogger.info(
      `Creating ${cases.length} cases in ${space ? `space: ${space}` : 'default space'}` +
        (totalAttachments > 0
          ? ` with ${commentsPerCase} comments and ${alertsPerCase} alerts each`
          : '')
    );

    const concurrency = totalAttachments > 0 ? 10 : 100;

    await pMap(
      cases,
      async (newCase, index) => {
        if (index % concurrency === 0) {
          const caseCount = cases.length;
          console.info(
            `CREATING CASES ${index + 1} to ${Math.min(index + concurrency, caseCount)}`
          );
        }

        try {
          const { data: createdCase } = await kbnClient.request<{ id: string }>({
            method: 'POST',
            path: casesPath,
            headers,
            body: newCase,
          });

          const caseId = createdCase.id;

          if (totalAttachments > 0) {
            const attachments = [
              ...Array.from({ length: commentsPerCase }, (_, i) =>
                createUserComment(newCase.owner, i)
              ),
              ...Array.from({ length: alertsPerCase }, (_, i) =>
                createAlertAttachment(newCase.owner, i)
              ),
            ];

            const commentPath = `${basePath}/api/cases/${caseId}/comments`;

            // Attachments must be added sequentially because they are embedded
            // on the case SO — parallel writes cause version conflicts.
            for (const attachment of attachments) {
              try {
                await kbnClient.request({
                  method: 'POST',
                  path: commentPath,
                  headers,
                  body: attachment,
                });
              } catch (err) {
                toolingLogger.error(
                  `Error adding ${attachment.type} to case ${caseId}: ${(err as Error).message}`
                );
              }
            }
          }
        } catch (error) {
          toolingLogger.error(`Error creating case: ${newCase.title}`);
          toolingLogger.error(error);
        }
      },
      { concurrency }
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
      comments: {
        alias: 'm',
        describe: 'Number of user comments per case',
        type: 'number',
        default: 0,
      },
      alerts: {
        alias: 'a',
        describe: 'Number of sample alert attachments per case',
        type: 'number',
        default: 0,
      },
      apiKey: {
        alias: 'apiKey',
        describe: 'API key to pass as an authorization header. Necessary for serverless',
        type: 'string',
        default: '',
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

    const { apiKey, username, password, kibana, count, owners, space, ssl, comments, alerts } =
      argv;
    const numCasesToCreate = Number(count);
    const commentsPerCase = Number(comments);
    const alertsPerCase = Number(alerts);
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

    const { kbnClient, headers } = createKbnClient({
      url: kibana,
      username,
      password,
      ssl,
      apiKey,
    });

    await generateCases({
      cases,
      space,
      kbnClient,
      headers,
      commentsPerCase,
      alertsPerCase,
    });

    toolingLogger.info('Done!');
    if (commentsPerCase > 0 || alertsPerCase > 0) {
      toolingLogger.info(
        `Created ${numCasesToCreate} cases, each with ${commentsPerCase} comments and ${alertsPerCase} alerts (embedded on case SO)`
      );
    }
  } catch (error) {
    console.log(error);
  }
};

main();

process.on('uncaughtException', function (err) {
  console.log(err);
});
