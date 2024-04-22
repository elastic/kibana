/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import { Client } from '@elastic/elasticsearch';
import * as rt from 'io-ts';
import { FAKE_HOSTS, FAKE_LOGS, FAKE_STACK } from '../constants';

export interface Doc {
  namespace: string;
  '@timestamp': Moment | string;
  labels?: object;
  tags?: string[];
}

export const DatasetRT = rt.keyof({
  [FAKE_HOSTS]: null,
  [FAKE_LOGS]: null,
  [FAKE_STACK]: null,
});

export type Dataset = rt.TypeOf<typeof DatasetRT>;

const TransitionMethodRT = rt.keyof({
  linear: null,
  exp: null,
  sine: null,
});

export type TransitionMethod = rt.TypeOf<typeof TransitionMethodRT>;

export const EventsPerCycleTransitionDefRT = rt.intersection([
  rt.type({
    start: rt.number,
    end: rt.number,
    method: TransitionMethodRT,
  }),
  rt.partial({
    options: rt.partial({
      period: rt.number,
    }),
  }),
]);

export const EventsPerCycleRT = rt.union([rt.number, EventsPerCycleTransitionDefRT]);

export type EventsPerCycle = rt.TypeOf<typeof EventsPerCycleRT>;

export const MetricEventDefRT = rt.intersection([
  rt.type({
    name: rt.string,
    method: TransitionMethodRT,
    start: rt.number,
    end: rt.number,
  }),
  rt.partial({
    period: rt.number,
    randomness: rt.number,
  }),
]);

export type MetricEventDef = rt.TypeOf<typeof MetricEventDefRT>;

const PartialScheduleBaseRT = rt.partial({
  eventsPerCycle: EventsPerCycleRT,
  interval: rt.number,
  delayInMinutes: rt.number,
  delayEveryMinutes: rt.number,
  randomness: rt.number,
  metrics: rt.array(MetricEventDefRT),
});

export const ScheduleRT = rt.intersection([
  rt.type({
    template: rt.string,
    start: rt.string,
    end: rt.union([rt.string, rt.boolean]),
  }),
  PartialScheduleBaseRT,
]);

export type Schedule = rt.TypeOf<typeof ScheduleRT>;

export const ParsedScheduleRT = rt.intersection([
  rt.type({
    template: rt.string,
    start: rt.number,
    end: rt.union([rt.boolean, rt.number]),
  }),
  PartialScheduleBaseRT,
]);

export type ParsedSchedule = rt.TypeOf<typeof ParsedScheduleRT>;

export const ConfigRT = rt.type({
  elasticsearch: rt.type({
    host: rt.string,
    username: rt.string,
    password: rt.string,
    apiKey: rt.string,
    installKibanaUser: rt.boolean,
  }),
  kibana: rt.type({
    host: rt.string,
    username: rt.string,
    password: rt.string,
    installAssets: rt.boolean,
  }),
  indexing: rt.type({
    dataset: DatasetRT,
    scenario: rt.string,
    interval: rt.number,
    eventsPerCycle: rt.number,
    payloadSize: rt.number,
    concurrency: rt.number,
    reduceWeekendTrafficBy: rt.number,
    ephemeralProjectIds: rt.number,
    alignEventsToInterval: rt.boolean,
  }),
  schedule: rt.array(ScheduleRT),
});

export type Config = rt.TypeOf<typeof ConfigRT>;

export const PartialConfigRT = rt.partial({
  elasticsearch: rt.partial(ConfigRT.props.elasticsearch.props),
  kibana: rt.partial(ConfigRT.props.kibana.props),
  indexing: rt.partial(ConfigRT.props.indexing.props),
  schedule: rt.array(ScheduleRT),
});
export type PartialConfig = rt.TypeOf<typeof PartialConfigRT>;

export type GeneratorFunction = (
  config: Config,
  schedule: ParsedSchedule,
  index: number,
  timestamp: Moment
) => Doc[];
export type EventFunction = (schedule: Schedule | ParsedSchedule, timestamp: Moment) => Doc[];
export type EventTemplate = Array<[EventFunction, number]>;

export type ElasticSearchService = (client: Client) => Promise<any>;

export const IndexTemplateDefRT = rt.type({
  namespace: rt.string,
  template: rt.UnknownRecord,
  components: rt.array(rt.type({ name: rt.string, template: rt.UnknownRecord })),
});

export type IndexTemplateDef = rt.TypeOf<typeof IndexTemplateDefRT>;

export interface Point {
  x: number;
  y: number;
}

export interface CliOptions {
  config: string;
  lookback: string;
  eventsPerCycle: number;
  payloadSize: number;
  concurrency: number;
  indexInterval: number;
  dataset: Dataset;
  scenario: string;
  elasticsearchHost: string;
  elasticsearchUsername: string;
  elasticsearchPassword: string;
  elasticsearchApiKey: undefined | string;
  kibanaUrl: string;
  kibanaUsername: string;
  kibanaPassword: string;
  installKibanaAssets: undefined | boolean;
  eventTemplate: string;
  reduceWeekendTrafficBy: number;
  ephemeralProjectIds: number;
  alignEventsToInterval: boolean;
}
