/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStartupEvents } from './lib/events/startup';
import { good } from './lib/events/good';
import { bad } from './lib/events/bad';
import { badHost } from './lib/events/bad_host';
import { weightedSample } from '../common/weighted_sample';

import { Doc, GeneratorFunction, EventFunction, EventTemplate } from '../../../types';
import { addEphemeralProjectId } from '../../../lib/add_ephemeral_project_id';

let firstRun = true;

export const kibanaAssets = `${__dirname}/assets/message_processor.ndjson`;

const GOOD_EVENT_TEMPLATES: EventTemplate = [
  [good, 99],
  [bad, 1],
];

const BAD_EVENT_TEMPLATES: EventTemplate = [[badHost(true), 1]];

function getTemplate(name: string) {
  if (name === 'bad') {
    return BAD_EVENT_TEMPLATES;
  }
  return GOOD_EVENT_TEMPLATES;
}

export const generateEvent: GeneratorFunction = (config, schedule, _index, timestamp) => {
  let startupEvents: Doc[] = [];
  if (firstRun) {
    firstRun = false;
    startupEvents = createStartupEvents(timestamp);
  }

  const template = getTemplate(schedule.template);
  const fn = weightedSample(template) as EventFunction;
  const events = addEphemeralProjectId(
    config.indexing.ephemeralProjectIds || 0,
    fn(schedule, timestamp).flat()
  );

  return [...startupEvents, ...events];
};
