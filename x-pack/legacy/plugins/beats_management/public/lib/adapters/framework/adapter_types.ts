/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import * as t from 'io-ts';
import { LICENSES } from './../../../../common/constants/security';

export interface FrameworkAdapter {
  // Instance vars
  info: FrameworkInfo;
  version: string;
  currentUser: FrameworkUser;
  // Methods
  waitUntilFrameworkReady(): Promise<void>;
  renderUIAtPath(
    path: string,
    component: React.ReactElement<any>,
    toController: 'management' | 'self'
  ): void;
  registerManagementSection(settings: {
    id?: string;
    name: string;
    iconName: string;
    order?: number;
  }): void;
  registerManagementUI(settings: {
    sectionId?: string;
    name: string;
    basePath: string;
    visable?: boolean;
    order?: number;
  }): void;
}

export const RuntimeFrameworkInfo = t.type({
  basePath: t.string,
  license: t.type({
    type: t.keyof(Object.fromEntries(LICENSES.map(s => [s, null])) as Record<string, null>),
    expired: t.boolean,
    expiry_date_in_millis: t.number,
  }),
  security: t.type({
    enabled: t.boolean,
    available: t.boolean,
  }),
  settings: t.type({
    encryptionKey: t.string,
    enrollmentTokensTtlInSeconds: t.number,
    defaultUserRoles: t.array(t.string),
  }),
});

export interface FrameworkInfo extends t.TypeOf<typeof RuntimeFrameworkInfo> {}

interface ManagementSection {
  register(
    sectionId: string,
    options: {
      visible: boolean;
      display: string;
      order: number;
      url: string;
    }
  ): void;
}
export interface ManagementAPI {
  getSection(sectionId: string): ManagementSection;
  hasItem(sectionId: string): boolean;
  register(sectionId: string, options: { display: string; icon: string; order: number }): void;
}

export const RuntimeFrameworkUser = t.interface(
  {
    username: t.string,
    roles: t.array(t.string),
    full_name: t.union([t.null, t.string]),
    email: t.union([t.null, t.string]),
    enabled: t.boolean,
  },
  'FrameworkUser'
);
export interface FrameworkUser extends t.TypeOf<typeof RuntimeFrameworkUser> {}
