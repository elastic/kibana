/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractStyleProperty } from './style_property';
import { STYLE_TYPE } from '../../../../../common/constants';

export class StaticStyleProperty extends AbstractStyleProperty {
  static type = STYLE_TYPE.STATIC;
}
