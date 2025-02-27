/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MONGODB } from '../../common/constants';

import base from './generated/elasticsearch/composable/component/base.json';
import log from './generated/elasticsearch/composable/component/log.json';
import host from './generated/elasticsearch/composable/component/host.json';
import mongodb from './generated/elasticsearch/composable/component/mongodb.json';

import template from './generated/elasticsearch/composable/template.json';
import { IndexTemplateDef } from '../../../../types';

const ECS_VERSION = template._meta.ecs_version;

const components = [
  { name: `${MONGODB}_${ECS_VERSION}_base`, template: base },
  { name: `${MONGODB}_${ECS_VERSION}_log`, template: log },
  { name: `${MONGODB}_${ECS_VERSION}_host`, template: host },
  { name: `${MONGODB}_${ECS_VERSION}_mongodb`, template: mongodb },
];

export const indexTemplate: IndexTemplateDef = {
  name: `logs-${MONGODB}@template`,
  template: { ...template, composed_of: components.map(({ name }) => name) },
  components,
};
