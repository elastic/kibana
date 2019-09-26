/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash';
import { Registry } from '@kbn/interpreter/common';
import { FunctionForm } from './function_form';

export class View extends FunctionForm {
  constructor(props) {
    super(props);

    const propNames = ['help', 'modelArgs', 'requiresContext'];
    const defaultProps = {
      help: `Element: ${props.name}`,
      requiresContext: true,
    };

    Object.assign(this, defaultProps, pick(props, propNames));

    this.modelArgs = this.modelArgs || [];

    if (!Array.isArray(this.modelArgs)) {
      throw new Error(`${this.name} element is invalid, modelArgs must be an array`);
    }
  }
}

class ViewRegistry extends Registry {
  wrapper(obj) {
    return new View(obj);
  }
}

export const viewRegistry = new ViewRegistry();
