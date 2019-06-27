/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class KibanaGlobalPrivileges {
  constructor(private readonly globalPrivilegesMap: Record<string, string[]>) {}

  public getAllPrivileges(): string[] {
    return Object.keys(this.globalPrivilegesMap);
  }

  public getActions(privilege: string): string[] {
    return this.globalPrivilegesMap[privilege] || [];
  }
}
