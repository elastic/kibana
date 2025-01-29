/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import base from './generated/elasticsearch/composable/component/base.json';
import event from './generated/elasticsearch/composable/component/event.json';
import host from './generated/elasticsearch/composable/component/host.json';
import metricset from './generated/elasticsearch/composable/component/metricset.json';
import system from './generated/elasticsearch/composable/component/system.json';

import template from './generated/elasticsearch/composable/template.json';
import { IndexTemplateDef } from '../../../types';

const ECS_VERSION = template._meta.ecs_version;

const components = [
  { name: `fake_hosts_${ECS_VERSION}_base`, template: base },
  { name: `fake_hosts_${ECS_VERSION}_event`, template: event },
  { name: `fake_hosts_${ECS_VERSION}_host`, template: host },
  { name: `fake_hosts_${ECS_VERSION}_metricset`, template: metricset },
  { name: `fake_hosts_${ECS_VERSION}_system`, template: system },
];

export const indexTemplate: IndexTemplateDef = {
  name: 'metrics-fake_hosts@template',
  template: { ...template, composed_of: components.map(({ name }) => name) },
  components,
};
