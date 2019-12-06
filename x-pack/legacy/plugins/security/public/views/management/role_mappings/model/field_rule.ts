/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Rule } from './rule';

export type FieldRuleValue = string | number | null | Array<string | number | null>;

export class FieldRule extends Rule {
  constructor(public readonly field: string, public readonly value: FieldRuleValue) {
    super();
  }

  public getType() {
    return `field`;
  }

  public getDisplayTitle() {
    return `The following is true`;
  }

  public clone() {
    return new FieldRule(this.field, _.cloneDeep(this.value));
  }

  public toRaw() {
    return {
      field: {
        [this.field]: this.value,
      },
    };
  }
}
