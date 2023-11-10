/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import base from '../composable/component/base.json';
import event from '../composable/component/event.json';
import host from '../composable/component/host.json';
import metricset from '../composable/component/metricset.json';
import system from '../composable/component/system.json';

import template from '../composable/template.json';
const IndexTemplateDefRT = rt.type({
  namespace: rt.string,
  template: rt.UnknownRecord,
  components: rt.array(rt.type({ name: rt.string, template: rt.UnknownRecord })),
});

export type IndexTemplateDef = rt.TypeOf<typeof IndexTemplateDefRT>;

const ECS_VERSION = template._meta.ecs_version;

const components = [
  { name: `fake_hosts_${ECS_VERSION}_base`, template: base },
  { name: `fake_hosts_${ECS_VERSION}_event`, template: event },
  { name: `fake_hosts_${ECS_VERSION}_host`, template: host },
  { name: `fake_hosts_${ECS_VERSION}_metricset`, template: metricset },
  { name: `fake_hosts_${ECS_VERSION}_system`, template: system },
];

export const indexTemplate: IndexTemplateDef = {
  namespace: 'fake_hosts',
  template: { ...template, composed_of: components.map(({ name }) => name) },
  components,
};
