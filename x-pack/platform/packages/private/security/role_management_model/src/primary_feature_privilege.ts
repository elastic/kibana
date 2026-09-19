/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureKibanaPrivileges } from '@kbn/features-plugin/public';
import { getCurrentMinimalPrivilegeId } from '@kbn/security-authorization-core-common';

import { KibanaPrivilege } from './kibana_privilege';

export class PrimaryFeaturePrivilege extends KibanaPrivilege {
  constructor(
    id: string,
    protected readonly config: FeatureKibanaPrivileges,
    public readonly actions: string[] = []
  ) {
    super(id, actions);
  }

  /**
   * Returns the CURRENT (latest) minimal privilege id for this privilege's base ('all'/'read') —
   * the id that must always be persisted when a role is saved with customized sub-feature
   * privileges, regardless of which minimal id (current or legacy) this instance itself
   * represents.
   */
  public getMinimalPrivilegeId() {
    const basePrivilegeId =
      this.id === 'read' || this.id.startsWith('minimal_read') ? 'read' : 'all';
    return getCurrentMinimalPrivilegeId(basePrivilegeId, this.config.privilegeVersions);
  }

  public get requireAllSpaces() {
    return this.config.requireAllSpaces ?? false;
  }

  public get disabled() {
    return this.config.disabled ?? false;
  }
}
