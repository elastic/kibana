/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureKibanaPrivileges } from '@kbn/features-plugin/public';

import { KibanaPrivilege } from './kibana_privilege';

export class PrimaryFeaturePrivilege extends KibanaPrivilege {
  constructor(
    id: string,
    protected readonly config: FeatureKibanaPrivileges,
    public readonly actions: string[] = []
  ) {
    super(id, actions);
  }

  public isMinimalFeaturePrivilege() {
    return this.id.startsWith('minimal_');
  }

  public getMinimalPrivilegeId() {
    if (this.isMinimalFeaturePrivilege()) {
      return this.id;
    }
    return `minimal_${this.id}`;
  }

  public get requireAllSpaces() {
    return this.config.requireAllSpaces ?? false;
  }

  public get disabled() {
    return this.config.disabled ?? false;
  }
}
