/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const featurePrefix = 'feature_';
const spacePrefix = 'space_';
const reservedPrefix = 'reserved_';
const basePrivilegeNames = ['all', 'read'];
const globalBasePrivileges = [...basePrivilegeNames];
const spaceBasePrivileges = basePrivilegeNames.map(
  privilegeName => `${spacePrefix}${privilegeName}`
);
const deserializeFeaturePrivilegeRegexp = new RegExp(
  `^${featurePrefix}([a-zA-Z0-9_-]+)\\.([a-zA-Z0-9_-]+)$`
);

interface FeaturePrivilege {
  featureId: string;
  privilege: string;
}

export class PrivilegeSerializer {
  public static isSerializedGlobalBasePrivilege(privilegeName: string) {
    return globalBasePrivileges.includes(privilegeName);
  }

  public static isSerializedSpaceBasePrivilege(privilegeName: string) {
    return spaceBasePrivileges.includes(privilegeName);
  }

  public static isSerializedReservedPrivilege(privilegeName: string) {
    return privilegeName.startsWith(reservedPrefix);
  }

  public static isSerializedFeaturePrivilege(privilegeName: string) {
    return privilegeName.startsWith(featurePrefix);
  }

  public static serializeGlobalBasePrivilege(privilegeName: string) {
    if (!globalBasePrivileges.includes(privilegeName)) {
      throw new Error('Unrecognized global base privilege');
    }

    return privilegeName;
  }

  public static serializeSpaceBasePrivilege(privilegeName: string) {
    if (!basePrivilegeNames.includes(privilegeName)) {
      throw new Error('Unrecognized space base privilege');
    }

    return `${spacePrefix}${privilegeName}`;
  }

  public static serializeFeaturePrivilege(featureId: string, privilegeName: string) {
    return `${featurePrefix}${featureId}.${privilegeName}`;
  }

  public static serializeReservedPrivilege(privilegeName: string) {
    return `${reservedPrefix}${privilegeName}`;
  }

  public static deserializeFeaturePrivilege(privilege: string): FeaturePrivilege {
    const match = privilege.match(deserializeFeaturePrivilegeRegexp);
    if (!match) {
      throw new Error(`Feature privilege '${privilege}' didn't match pattern`);
    }

    return {
      featureId: match[1],
      privilege: match[2],
    };
  }

  public static deserializeGlobalBasePrivilege(privilege: string) {
    if (PrivilegeSerializer.isSerializedGlobalBasePrivilege(privilege)) {
      return privilege;
    }

    throw new Error('Unrecognized global base privilege');
  }

  public static deserializeSpaceBasePrivilege(privilege: string) {
    if (!PrivilegeSerializer.isSerializedSpaceBasePrivilege(privilege)) {
      throw new Error('Unrecognized space base privilege');
    }

    return privilege.slice(spacePrefix.length);
  }

  public static deserializeReservedPrivilege(privilege: string) {
    if (!PrivilegeSerializer.isSerializedReservedPrivilege(privilege)) {
      throw new Error('Unrecognized reserved privilege');
    }

    return privilege.slice(reservedPrefix.length);
  }
}
