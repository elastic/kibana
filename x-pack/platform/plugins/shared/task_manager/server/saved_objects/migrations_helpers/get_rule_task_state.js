/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
Used to get data for a migration test.  

This script will create a metric threshold and index threshold rule,
for the purposes of looking at their task state.  It arranges to get
the rules active and then recovered, so that the alert data will show
up in both the "active" and "recovered but tracking for flapping"
containers.

It then will send data for the alerts to go active on, then recover,
forever.

It will then query the task documents for the rules, waiting till it
gets some in both of the containers.  It prints the task document as
a single line of JSON, and the task state as pretty JSON, just so you
can "read it" - because it's stored as a JSON string in the task doc.

- env var `$KBN_URL` should be set to your Kibana URL, with user/pass.
- env var `$ES_URL`  should be set to your Elasticsearch URL, with user/pass.
*/

const path = require('path');
const { Agent } = require('undici');

const KB_URL = process.env.KB_URL || process.env.KBN_URL;
const ES_URL = process.env.ES_URL;

const dataIndex = 'rule-task-state--dev';
const dataAlias = `metrics-${dataIndex}`; // metrics rules look for metrics-* indices
const mappings = {
  properties: {
    '@timestamp': { type: 'date' },
    'network.packets': { type: 'long' },
    'network.name': { type: 'keyword' },
  },
};

let Active = true;
let Conn;
let MtRule;
let ItRule;

main();

async function main() {
  const createdIndex = await putEs(dataIndex, { mappings });
  console.log(`created index:            ${JSON.stringify(createdIndex)}`);

  const alias = await putEs(`${dataIndex}/_alias/${dataAlias}`);
  console.log(`alias for metrics:        ${JSON.stringify(alias)}`);

  // write data @ 1s, alternating active / not active @ 5s
  setInterval(writeData, 1000);
  setInterval(() => (Active = !Active), 5000);

  const createConnPayload = {
    name: 'server log for rule-task-state',
    connector_type_id: '.server-log',
  };

  Conn = await postKbn(`api/actions/connector`, createConnPayload);
  console.log(`server log id:            ${Conn.id}`);

  MtRule = await postKbn(`api/alerting/rule`, getMtRulePayload());
  console.log(`metric threshold rule id: ${MtRule.id}`);

  ItRule = await postKbn(`api/alerting/rule`, getItRulePayload());
  console.log(`index  threshold rule id: ${ItRule.id}`);

  setInterval(getTaskDocs, 3000);
}

function writeData() {
  const date = new Date().toISOString();
  postEs(`${dataIndex}/_doc`, {
    '@timestamp': date,
    network: { name: 'host-A', packets: Active ? 1 : 0 },
  });
  postEs(`${dataIndex}/_doc`, {
    '@timestamp': date,
    network: { name: 'host-B', packets: Active ? 1 : 0 },
  });
  postEs(`${dataIndex}/_doc`, {
    '@timestamp': date,
    network: { name: 'host-C', packets: Active ? 0 : 1 },
  });
}

async function getTaskDocs() {
  const { task: mtTaskState, ruleState: mtRuleState } = await getTask(MtRule.id);
  const { task: itTaskState, ruleState: itRuleState } = await getTask(ItRule.id);

  console.log('--------------------------------------------------------');
  console.log(JSON.stringify(itTaskState._source));
  console.log(JSON.stringify(itRuleState, null, 4));
  console.log();
  console.log(JSON.stringify(mtTaskState._source));
  console.log(JSON.stringify(mtRuleState, null, 4));
  console.log();
  console.log('waiting for better task docs');
  console.log();

  if (
    Object.keys(itRuleState.alertInstances).length > 0 &&
    Object.keys(mtRuleState.alertInstances).length > 0 &&
    Object.keys(itRuleState.alertRecoveredInstances).length > 0 &&
    Object.keys(mtRuleState.alertRecoveredInstances).length > 0
  ) {
    console.log('that last one is a keeper!');

    console.log('full docs for es archive:');
    console.log('');
    console.log(JSON.stringify(itTaskState, null, 4));
    console.log('');
    console.log(JSON.stringify(mtTaskState, null, 4));
    console.log('');
    process.exit(0);
  }
}

function getMtRulePayload() {
  return {
    consumer: 'infrastructure',
    name: 'rule-mt',
    schedule: {
      interval: '3s',
    },
    params: {
      criteria: [
        {
          aggType: 'max',
          comparator: '>',
          threshold: [0],
          timeSize: 3,
          timeUnit: 's',
          metric: 'network.packets',
        },
      ],
      sourceId: 'default',
      alertOnNoData: false,
      alertOnGroupDisappear: false,
      groupBy: ['network.name'],
    },
    rule_type_id: 'metrics.alert.threshold',
    notify_when: 'onActiveAlert',
    actions: [
      {
        group: 'metrics.threshold.fired',
        id: Conn.id,
        params: {
          message:
            '{{alertName}} - {{context.group}} is in a state of {{context.alertState}}\n\nReason:\n{{context.reason}}\n',
        },
      },
    ],
  };
}

function getItRulePayload() {
  return {
    rule_type_id: '.index-threshold',
    name: 'rule-it',
    notify_when: 'onActiveAlert',
    consumer: 'alerts',
    schedule: { interval: '3s' },
    actions: [
      {
        group: 'threshold met',
        id: Conn.id,
        params: { message: '{{context.message}}' },
      },
    ],
    params: {
      index: [dataIndex],
      timeField: '@timestamp',
      aggType: 'max',
      aggField: 'network.packets',
      groupBy: 'top',
      termSize: 100,
      termField: 'network.name',
      timeWindowSize: 3,
      timeWindowUnit: 's',
      thresholdComparator: '>',
      threshold: [0],
    },
  };
}

/** @type { (id: string) => Promise<any> } */
async function getTask(id) {
  await getURL(`${ES_URL}/_refresh`);

  const task = await getEs(`/.kibana_task_manager/_doc/task:${id}`);

  const ruleStateJ = task._source.task.state;
  const ruleState = JSON.parse(ruleStateJ);

  return { task, ruleState };
}

async function getEs(url) {
  return getURL(path.join(ES_URL, url));
}
async function postEs(url, body) {
  return postURL(path.join(ES_URL, url), body);
}
async function putEs(url, body) {
  return putURL(path.join(ES_URL, url), body);
}

// eslint-disable-next-line no-unused-vars
async function getKbn(url) {
  return getURL(path.join(KB_URL, url));
}
async function postKbn(url, body) {
  return postURL(path.join(KB_URL, url), body);
}
// eslint-disable-next-line no-unused-vars
async function putKbn(url, body) {
  return putURL(path.join(KB_URL, url), body);
}

async function getURL(url) {
  return sendURL(url, 'GET');
}
async function postURL(url, body) {
  return sendURL(url, 'POST', body);
}
async function putURL(url, body) {
  return sendURL(url, 'PUT', body);
}

async function sendURL(urlWithPass, method, body) {
  const purl = new URL(urlWithPass);
  const userPass = `${purl.username}:${purl.password}`;
  const userPassEn = Buffer.from(userPass).toString('base64');
  const auth = `Basic ${userPassEn}`;
  const url = `${purl.origin}${purl.pathname}${purl.search}`;
  const headers = {
    'content-type': 'application/json',
    'kbn-xsrf': 'foo',
    authorization: auth,
  };

  const fetchOptions = { method, headers };
  if (body) fetchOptions.body = JSON.stringify(body);

  if (purl.protocol === 'https:') {
    fetchOptions.dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
  }

  // console.log(`fetch("${url}", ${JSON.stringify(fetchOptions, null, 4)}`)
  const response = await fetch(url, fetchOptions);
  const object = await response.json();
  // console.log(`fetch(...): ${JSON.stringify(object, null, 4)}`)
  return object;
}
