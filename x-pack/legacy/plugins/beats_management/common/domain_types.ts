/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { configBlockSchemas } from './config_schemas';
import { DateFromString } from './io_ts_types';

export const OutputTypesArray = ['elasticsearch', 'logstash', 'kafka', 'redis'];

// Here we create the runtime check for a generic, unknown beat config type.
// We can also pass in optional params to create spacific runtime checks that
// can be used to validate blocs on the API and UI
export const createConfigurationBlockInterface = (
  configType: t.LiteralType<string> | t.KeyofC<Record<string, null>> = t.keyof(
    Object.fromEntries(configBlockSchemas.map(s => [s.id, null])) as Record<string, null>
  ),
  beatConfigInterface: t.Mixed = t.Dictionary
) =>
  t.interface(
    {
      id: t.union([t.undefined, t.string]),
      type: configType,
      description: t.union([t.undefined, t.string]),
      tag: t.string,
      config: beatConfigInterface,
      last_updated: t.union([t.undefined, t.number]),
    },
    'ConfigBlock'
  );
const BaseConfigurationBlock = createConfigurationBlockInterface();
export interface ConfigurationBlock
  extends Pick<
    t.TypeOf<typeof BaseConfigurationBlock>,
    Exclude<keyof t.TypeOf<typeof BaseConfigurationBlock>, 'id'>
  > {
  id: string;
}

export interface CMBeat {
  id: string;
  status?: BeatEvent;
  enrollment_token: string;
  active: boolean;
  access_token: string;
  verified_on?: string;
  type: string;
  version?: string;
  host_ip: string;
  host_name: string;
  ephemeral_id?: string;
  last_checkin?: Date;
  event_rate?: string;
  local_configuration_yml?: string;
  tags: string[];
  central_configuration_yml?: string;
  metadata?: {};
  name?: string;
  last_updated: number;
}

export interface ConfigBlockSchema {
  id: string;
  name: string;
  version: number;
  allowOtherConfigs?: boolean;
  configs: BeatConfigSchema[];
}

export interface BeatConfigSchema {
  id: string;
  ui: {
    label: string;
    labelId?: string;
    type: 'input' | 'multi-input' | 'select' | 'code' | 'password';
    helpText?: string;
    helpTextId?: string;
    placeholder?: string;
  };
  options?: Array<{ value: string; text: string }>;
  validation?: 'isHosts' | 'isString' | 'isPeriod' | 'isPath' | 'isPaths' | 'isYaml';
  error: string;
  errorId: string;
  defaultValue?: string;
  required?: boolean;
  parseValidResult?: (value: any) => any;
}

export const RuntimeBeatTag = t.interface(
  {
    id: t.union([t.undefined, t.string]),
    name: t.string,
    color: t.string,
    hasConfigurationBlocksTypes: t.array(t.string),
  },
  'CMBeat'
);
export interface BeatTag
  extends Pick<
    t.TypeOf<typeof RuntimeBeatTag>,
    Exclude<keyof t.TypeOf<typeof RuntimeBeatTag>, 'id'>
  > {
  id: string;
  // Used by the UI and api when a tag exists but is an invalid option
  disabled?: boolean;
}

export const RuntimeBeatEvent = t.interface(
  {
    type: t.union([t.literal('STATE'), t.literal('ERROR')]),
    beat: t.union([t.undefined, t.string]),
    timestamp: DateFromString,
    event: t.type({
      type: t.union([
        t.literal('RUNNING'),
        t.literal('STARTING'),
        t.literal('IN_PROGRESS'),
        t.literal('CONFIG'),
        t.literal('FAILED'),
        t.literal('STOPPED'),
      ]),
      message: t.string,
      uuid: t.union([t.undefined, t.string]),
    }),
  },
  'BeatEvent'
);
export interface BeatEvent
  extends Pick<
    t.TypeOf<typeof RuntimeBeatEvent>,
    Exclude<keyof t.TypeOf<typeof RuntimeBeatEvent>, 'timestamp'>
  > {
  beat: string;
  timestamp: Date;
}
