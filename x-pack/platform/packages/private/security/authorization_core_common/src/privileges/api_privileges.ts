/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ApiOperation } from '@kbn/security-plugin-types-common';

export class ApiPrivileges {
  public static manage(subject: string) {
    return `${ApiOperation.Manage}_${subject}`;
  }

  public static read(subject: string) {
    return `${ApiOperation.Read}_${subject}`;
  }

  public static create(subject: string) {
    return `${ApiOperation.Create}_${subject}`;
  }

  public static update(subject: string) {
    return `${ApiOperation.Update}_${subject}`;
  }

  public static delete(subject: string) {
    return `${ApiOperation.Delete}_${subject}`;
  }
}
