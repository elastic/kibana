/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AbstractStyleProperty } from './style_property';
import { STYLE_TYPE } from '../../../../../common/constants';

export class StaticStyleProperty<T extends object> extends AbstractStyleProperty<T> {
  static type = STYLE_TYPE.STATIC;
}
