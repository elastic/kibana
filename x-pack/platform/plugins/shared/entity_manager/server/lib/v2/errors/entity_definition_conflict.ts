/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefinitionType } from '../types';

export class EntityDefinitionConflict extends Error {
  constructor(definitionType: DefinitionType, id: string) {
    super(`An entity ${definitionType} definition with the ID "${id}" already exists.`);
    this.name = 'EntityDefinitionConflict';
  }
}
