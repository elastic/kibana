/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Registry } from '@kbn/interpreter';
import { Template } from './template';

class TemplateRegistry extends Registry {
  wrapper(obj) {
    return new Template(obj);
  }
}

export const templatesRegistry = new TemplateRegistry();
