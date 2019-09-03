/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Registry } from '@kbn/interpreter/common';
import { Element } from './element';

class ElementsRegistry extends Registry {
  wrapper(obj) {
    return new Element(obj);
  }
}

export const elementsRegistry = new ElementsRegistry();
