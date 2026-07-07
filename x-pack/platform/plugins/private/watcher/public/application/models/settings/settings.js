/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class Settings {
  constructor(props) {
    this.actionTypes = props.actionTypes;
  }

  static fromUpstreamJson(json) {
    const actionTypes = json.action_types;
    const props = {
      actionTypes,
    };
    return new Settings(props);
  }
}
