/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export abstract class Skill {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly shortDescription: string;
  abstract readonly content: string;
  abstract readonly filePath: string;
}
