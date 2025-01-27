/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { BaseAction } from './base_action';

export class UnknownAction extends BaseAction {
  constructor(props = {}) {
    super(props);

    this.actionJson = get(props, 'actionJson');
  }

  get upstreamJson() {
    const result = super.upstreamJson;

    Object.assign(result, {
      actionJson: this.actionJson,
    });

    return result;
  }

  static fromUpstreamJson(upstreamAction) {
    return new UnknownAction(upstreamAction);
  }
}
