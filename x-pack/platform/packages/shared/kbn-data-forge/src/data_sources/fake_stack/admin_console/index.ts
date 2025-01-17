/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStartupEvents } from './lib/events/startup';
import { login } from './lib/events/login';
import { loginError } from './lib/events/login_error';
import { internalError } from './lib/events/internal_error';
import { weightedSample } from '../common/weighted_sample';
import { listCustomers } from './lib/events/list_customers';
import { mongodbConnectionError } from './lib/events/mongodb_connection_error';
import { viewUsers } from './lib/events/view_user';
import { deleteUser } from './lib/events/delete_user';
import { createUser } from './lib/events/create_user';
import { editUser } from './lib/events/edit_user';
import { Doc, EventFunction, EventTemplate, GeneratorFunction } from '../../../types';
import { qaDeployedToProduction } from './lib/events/qa_deployed_to_production';
import { mongodbProxyTimeout } from './lib/events/mongodb_proxy_timeout';
import { addEphemeralProjectId } from '../../../lib/add_ephemeral_project_id';

const GOOD_EVENT_TEMPLATES: EventTemplate = [
  [mongodbProxyTimeout, 1],
  [loginError, 1],
  [login, 10],
  [listCustomers, 20],
  [viewUsers, 20],
  [deleteUser, 20],
  [createUser, 20],
  [editUser, 20],
];

const BAD_EVENT_TEMPLATES: EventTemplate = [[mongodbConnectionError, 1]];

const INTERNAL_ERRORS_EVENT_TEMPLATES: EventTemplate = [[internalError, 1]];

const CONNECTION_TIMEOUT_EVENT_TEMPLATES: EventTemplate = [[qaDeployedToProduction, 1]];

function getTemplate(name: string) {
  if (name === 'bad') {
    return BAD_EVENT_TEMPLATES;
  }
  if (name === 'internalErrors') {
    return INTERNAL_ERRORS_EVENT_TEMPLATES;
  }
  if (name === 'connectionTimeout') {
    return CONNECTION_TIMEOUT_EVENT_TEMPLATES;
  }
  return GOOD_EVENT_TEMPLATES;
}

let firstRun = true;
export const kibanaAssets = `${__dirname}/assets/admin_console.ndjson`;

export const generateEvent: GeneratorFunction = (config, schedule, _index, timestamp) => {
  let startupEvents: Doc[] = [];
  if (firstRun && schedule.template !== 'internalErrors') {
    firstRun = false;
    startupEvents = createStartupEvents(schedule, timestamp);
  }

  const template = getTemplate(schedule.template);
  const fn = weightedSample(template) as EventFunction;
  const events = addEphemeralProjectId(
    config.indexing.ephemeralProjectIds || 0,
    fn(schedule, timestamp).flat()
  );

  return [...startupEvents, ...events];
};
