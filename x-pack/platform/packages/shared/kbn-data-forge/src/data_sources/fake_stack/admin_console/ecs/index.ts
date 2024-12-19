/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADMIN_CONSOLE } from '../../common/constants';

import base from './generated/elasticsearch/composable/component/base.json';
import event from './generated/elasticsearch/composable/component/event.json';
import http from './generated/elasticsearch/composable/component/http.json';
import url from './generated/elasticsearch/composable/component/url.json';
import user from './generated/elasticsearch/composable/component/user.json';
import userAgent from './generated/elasticsearch/composable/component/user_agent.json';
import log from './generated/elasticsearch/composable/component/log.json';
import host from './generated/elasticsearch/composable/component/host.json';

import template from './generated/elasticsearch/composable/template.json';
import { IndexTemplateDef } from '../../../../types';

const ECS_VERSION = template._meta.ecs_version;

const components = [
  { name: `${ADMIN_CONSOLE}_${ECS_VERSION}_base`, template: base },
  { name: `${ADMIN_CONSOLE}_${ECS_VERSION}_event`, template: event },
  { name: `${ADMIN_CONSOLE}_${ECS_VERSION}_http`, template: http },
  { name: `${ADMIN_CONSOLE}_${ECS_VERSION}_url`, template: url },
  { name: `${ADMIN_CONSOLE}_${ECS_VERSION}_user`, template: user },
  { name: `${ADMIN_CONSOLE}_${ECS_VERSION}_user_agent`, template: userAgent },
  { name: `${ADMIN_CONSOLE}_${ECS_VERSION}_log`, template: log },
  { name: `${ADMIN_CONSOLE}_${ECS_VERSION}_host`, template: host },
];

export const indexTemplate: IndexTemplateDef = {
  name: `logs-${ADMIN_CONSOLE}@template`,
  template: {
    ...template,
    composed_of: components.map(({ name }) => name),
  },
  components,
};
