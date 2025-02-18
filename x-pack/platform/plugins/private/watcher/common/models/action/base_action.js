/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class BaseAction {
  constructor(props, errors) {
    this.id = props.id;
    this.type = props.type;
    this.errors = errors;
  }

  get downstreamJson() {
    const result = {
      id: this.id,
      type: this.type,
    };

    return result;
  }

  get upstreamJson() {
    const result = {};
    return result;
  }

  static getPropsFromDownstreamJson(json) {
    return {
      id: json.id,
    };
  }

  static getPropsFromUpstreamJson(json) {
    return {
      id: json.id,
    };
  }
}
