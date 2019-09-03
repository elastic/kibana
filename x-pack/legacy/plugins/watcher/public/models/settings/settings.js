/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class Settings {
  constructor(props) {
    this.actionTypes = props.actionTypes;
  }

  static fromUpstreamJson(json) {
    const actionTypes = json.action_types;
    const props = {
      actionTypes
    };
    return new Settings(props);
  }
}
