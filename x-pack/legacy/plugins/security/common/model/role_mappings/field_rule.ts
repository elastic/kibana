/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { BaseRule } from './base_rule';
import { RoleMappingFieldRuleValue } from '..';

export class FieldRule extends BaseRule {
  constructor(public readonly field: string, public readonly value: RoleMappingFieldRuleValue) {
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
