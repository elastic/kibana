/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HEARTBEAT } from '../../common/constants';

import base from './generated/elasticsearch/composable/component/base.json';
import log from './generated/elasticsearch/composable/component/log.json';
import event from './generated/elasticsearch/composable/component/event.json';

import template from './generated/elasticsearch/composable/template.json';
import { IndexTemplateDef } from '../../../../types';

const ECS_VERSION = template._meta.ecs_version;

const components = [
  { name: `${HEARTBEAT}_${ECS_VERSION}_base`, template: base },
  { name: `${HEARTBEAT}_${ECS_VERSION}_log`, template: log },
  { name: `${HEARTBEAT}_${ECS_VERSION}_host`, template: event },
];

export const indexTemplate: IndexTemplateDef = {
  name: `logs-${HEARTBEAT}@template`,
  template: { ...template, composed_of: components.map(({ name }) => name) },
  components,
};
