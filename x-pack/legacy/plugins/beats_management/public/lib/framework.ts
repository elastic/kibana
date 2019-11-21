/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { difference, get } from 'lodash';
import { LICENSES, LicenseType } from '../../common/constants/security';
import { FrameworkAdapter } from './adapters/framework/adapter_types';

export class FrameworkLib {
  public waitUntilFrameworkReady = this.adapter.waitUntilFrameworkReady.bind(this.adapter);
  public renderUIAtPath = this.adapter.renderUIAtPath.bind(this.adapter);
  public registerManagementSection = this.adapter.registerManagementSection.bind(this.adapter);
  public registerManagementUI = this.adapter.registerManagementUI.bind(this.adapter);

  constructor(private readonly adapter: FrameworkAdapter) {}

  public get currentUser() {
    return this.adapter.currentUser;
  }

  public get info() {
    return this.adapter.info;
  }

  public licenseIsAtLeast(type: LicenseType) {
    return (
      LICENSES.indexOf(get(this.adapter.info, 'license.type', 'oss')) >= LICENSES.indexOf(type)
    );
  }

  public versionGreaterThen(version: string) {
    const pa = this.adapter.version.split('.');
    const pb = version.split('.');
    for (let i = 0; i < 3; i++) {
      const na = Number(pa[i]);
      const nb = Number(pb[i]);
      // version is greater
      if (na > nb) {
        return true;
      }
      // version is less then
      if (nb > na) {
        return false;
      }
      if (!isNaN(na) && isNaN(nb)) {
        return true;
      }
      if (isNaN(na) && !isNaN(nb)) {
        return false;
      }
    }
    return true;
  }

  public currentUserHasOneOfRoles(roles: string[]) {
    // If the user has at least one of the roles requested, the returnd difference will be less
    // then the orig array size. difference only compares based on the left side arg
    return difference(roles, get<string[]>(this.currentUser, 'roles', [])).length < roles.length;
  }
}
