/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { AbstractField } from './field';

//todo: need to be implemented
export class KibanaRegionField extends AbstractField {

  static type = 'KIBANA_REGION';

  async getType() {
    return AbstractField.FIELD_TYPE.STRING;
  }

}
