/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Registry } from '@kbn/interpreter';
import { View } from './view';
import type { View as ViewType, ViewProps } from './view';

class ViewRegistry extends Registry<ViewProps, ViewType> {
  wrapper(obj: ViewProps): ViewType {
    return new View(obj);
  }
}

export const viewRegistry = new ViewRegistry();
