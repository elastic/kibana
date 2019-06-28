/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { cloneDeep, difference, uniq } from 'lodash';
import { UICapabilities } from 'ui/capabilities';
/**
 * Feature privilege definition
 */
export interface FeatureKibanaPrivileges {
  /**
   * If this feature includes management sections, you can specify them here to control visibility of those
   * pages based on user privileges.
   *
   * Example:
   * // Enables access to the "Advanced Settings" management page within the Kibana section
   * management: {
   *   kibana: ['settings']
   * }
   */
  management?: {
    [sectionId: string]: string[];
  };

  /**
   * If this feature includes a catalogue entry, you can specify them here to control visibility based on user permissions.
   */
  catalogue?: string[];

  /**
   * If your feature includes server-side APIs, you can tag those routes to secure access based on user permissions.
   *
   * Example:
   * // Configure your routes with a tag starting with the 'access:' prefix
   * server.route({
   *   path: '/api/my-route',
   *   method: 'GET',
   *   handler: () => { ...},
   *   options: {
   *     tags: ['access:my_feature-admin']
   *   }
   * });
   *
   * Then, specify the tags here (without the 'access:' prefix) which should be secured:
   *
   * {
   *    api: ['my_feature-admin']
   * }
   *
   * NOTE: It is important to name your tags in a way that will not collide with other plugins/features.
   * A generic tag name like "access:read" could be used elsewhere, and access to that API endpoint would also
   * extend to any routes you have also tagged with that name.
   */
  api?: string[];

  /**
   * If your feature exposes a client-side application (most of them do!), then you can control access to them here.
   *
   * Example:
   * {
   *   app: ['my-app', 'kibana']
   * }
   *
   */
  app?: string[];

  /**
   * If your feature requires access to specific saved objects, then specify your access needs here.
   */
  savedObject: {
    /**
     * List of saved object types which users should have full read/write access to when granted this privilege.
     * Example:
     * {
     *   all: ['my-saved-object-type']
     * }
     */
    all: string[];

    /**
     * List of saved object types which users should have read-only access to when granted this privilege.
     * Example:
     * {
     *    read: ['config']
     * }
     */
    read: string[];
  };
  /**
   * A list of UI Capabilities that should be granted to users with this privilege.
   * These capabilities will automatically be namespaces within your feature id.
   *
   * Example:
   * {
   *   ui: ['show', 'save']
   * }
   *
   * This translates in the UI to the following (assuming a feature id of "foo"):
   *  import { uiCapabilities } from 'ui/capabilities';
   *
   *  const canShowApp = uiCapabilities.foo.show;
   *  const canSave = uiCapabilities.foo.save;
   *
   * Note: Since these are automatically namespaced, you are free to use generic names like "show" and "save".
   *
   * @see UICapabilities
   */
  ui: string[];
}

type PrivilegesSet = Record<string, FeatureKibanaPrivileges>;

export type FeatureWithAllOrReadPrivileges = Feature<{
  all?: FeatureKibanaPrivileges;
  read?: FeatureKibanaPrivileges;
}>;

/**
 * Interface for registering a feature.
 * Feature registration allows plugins to hide their applications with spaces,
 * and secure access when configured for security.
 */
export interface Feature<TPrivileges extends Partial<PrivilegesSet> = PrivilegesSet> {
  /**
   * Unique identifier for this feature.
   * This identifier is also used when generating UI Capabilities.
   *
   * @see UICapabilities
   */
  id: string;

  /**
   * Display name for this feature.
   * This will be displayed to end-users, so a translatable string is advised for i18n.
   */
  name: string;

  /**
   * Optional array of supported licenses.
   * If omitted, all licenses are allowed.
   * This does not restrict access to your feature based on license.
   * Its only purpose is to inform the space and roles UIs on which features to display.
   */
  validLicenses?: Array<'basic' | 'standard' | 'gold' | 'platinum'>;

  /**
   * An optional EUI Icon to be used when displaying your feature.
   */
  icon?: string;

  /**
   * The optional Nav Link ID for feature.
   * If specified, your link will be automatically hidden if needed based on the current space and user permissions.
   */
  navLinkId?: string;

  /**
   * An array of app ids that are enabled when this feature is enabled.
   * Apps specified here will automatically cascade to the privileges defined below, unless specified differently there.
   */
  app: string[];

  /**
   * If this feature includes management sections, you can specify them here to control visibility of those
   * pages based on the current space.
   *
   * Items specified here will automatically cascade to the privileges defined below, unless specified differently there.
   *
   * Example:
   * // Enables access to the "Advanced Settings" management page within the Kibana section
   * management: {
   *   kibana: ['settings']
   * }
   */
  management?: {
    [sectionId: string]: string[];
  };
  /**
   * If this feature includes a catalogue entry, you can specify them here to control visibility based on the current space.
   *
   * Items specified here will automatically cascade to the privileges defined below, unless specified differently there.
   */
  catalogue?: string[];

  /**
   * Feature privilege definition.
   *
   * Example:
   * {
   *   all: {...},
   *   read: {...}
   * }
   * @see FeatureKibanaPrivileges
   */
  privileges: TPrivileges;

  /**
   * Optional message to display on the Role Management screen when configuring permissions for this feature.
   */
  privilegesTooltip?: string;

  /**
   * @private
   */
  reserved?: {
    privilege: FeatureKibanaPrivileges;
    description: string;
  };
}

// Each feature gets its own property on the UICapabilities object,
// but that object has a few built-in properties which should not be overwritten.
const prohibitedFeatureIds: Array<keyof UICapabilities> = ['catalogue', 'management', 'navLinks'];

const featurePrivilegePartRegex = /^[a-zA-Z0-9_-]+$/;
const managementSectionIdRegex = /^[a-zA-Z0-9_-]+$/;
export const uiCapabilitiesRegex = /^[a-zA-Z0-9:_-]+$/;

const managementSchema = Joi.object().pattern(
  managementSectionIdRegex,
  Joi.array().items(Joi.string().regex(uiCapabilitiesRegex))
);
const catalogueSchema = Joi.array().items(Joi.string().regex(uiCapabilitiesRegex));

const privilegeSchema = Joi.object({
  management: managementSchema,
  catalogue: catalogueSchema,
  api: Joi.array().items(Joi.string()),
  app: Joi.array().items(Joi.string()),
  savedObject: Joi.object({
    all: Joi.array()
      .items(Joi.string())
      .required(),
    read: Joi.array()
      .items(Joi.string())
      .required(),
  }).required(),
  ui: Joi.array()
    .items(Joi.string().regex(uiCapabilitiesRegex))
    .required(),
});

const schema = Joi.object({
  id: Joi.string()
    .regex(featurePrivilegePartRegex)
    .invalid(...prohibitedFeatureIds)
    .required(),
  name: Joi.string().required(),
  validLicenses: Joi.array().items(Joi.string().valid('basic', 'standard', 'gold', 'platinum')),
  icon: Joi.string(),
  description: Joi.string(),
  navLinkId: Joi.string().regex(uiCapabilitiesRegex),
  app: Joi.array()
    .items(Joi.string())
    .required(),
  management: managementSchema,
  catalogue: catalogueSchema,
  privileges: Joi.object({
    all: privilegeSchema,
    read: privilegeSchema,
  }).required(),
  privilegesTooltip: Joi.string(),
  reserved: Joi.object({
    privilege: privilegeSchema.required(),
    description: Joi.string().required(),
  }),
});

export class FeatureRegistry {
  private locked = false;
  private features: Record<string, Feature> = {};

  public register(feature: FeatureWithAllOrReadPrivileges) {
    if (this.locked) {
      throw new Error(`Features are locked, can't register new features`);
    }

    validateFeature(feature);

    if (feature.id in this.features) {
      throw new Error(`Feature with id ${feature.id} is already registered.`);
    }

    const featureCopy: Feature = cloneDeep(feature as Feature);

    this.features[feature.id] = applyAutomaticPrivilegeGrants(featureCopy as Feature);
  }

  public getAll(): Feature[] {
    this.locked = true;
    return cloneDeep(Object.values(this.features));
  }
}

function validateFeature(feature: FeatureWithAllOrReadPrivileges) {
  const validateResult = Joi.validate(feature, schema);
  if (validateResult.error) {
    throw validateResult.error;
  }
  // the following validation can't be enforced by the Joi schema, since it'd require us looking "up" the object graph for the list of valid value, which they explicitly forbid.
  const { app = [], management = {}, catalogue = [] } = feature;

  const privilegeEntries = [...Object.entries(feature.privileges)];
  if (feature.reserved) {
    privilegeEntries.push(['reserved', feature.reserved.privilege]);
  }

  privilegeEntries.forEach(([privilegeId, privilegeDefinition]) => {
    if (!privilegeDefinition) {
      throw new Error('Privilege definition may not be null or undefined');
    }

    const unknownAppEntries = difference(privilegeDefinition.app || [], app);
    if (unknownAppEntries.length > 0) {
      throw new Error(
        `Feature privilege ${
          feature.id
        }.${privilegeId} has unknown app entries: ${unknownAppEntries.join(', ')}`
      );
    }

    const unknownCatalogueEntries = difference(privilegeDefinition.catalogue || [], catalogue);
    if (unknownCatalogueEntries.length > 0) {
      throw new Error(
        `Feature privilege ${
          feature.id
        }.${privilegeId} has unknown catalogue entries: ${unknownCatalogueEntries.join(', ')}`
      );
    }

    Object.entries(privilegeDefinition.management || {}).forEach(
      ([managementSectionId, managementEntry]) => {
        if (!management[managementSectionId]) {
          throw new Error(
            `Feature privilege ${
              feature.id
            }.${privilegeId} has unknown management section: ${managementSectionId}`
          );
        }

        const unknownSectionEntries = difference(managementEntry, management[managementSectionId]);

        if (unknownSectionEntries.length > 0) {
          throw new Error(
            `Feature privilege ${
              feature.id
            }.${privilegeId} has unknown management entries for section ${managementSectionId}: ${unknownSectionEntries.join(
              ', '
            )}`
          );
        }
      }
    );
  });
}

function applyAutomaticPrivilegeGrants(feature: Feature): Feature {
  const { all: allPrivilege, read: readPrivilege } = feature.privileges;
  const reservedPrivilege = feature.reserved ? feature.reserved.privilege : null;

  applyAutomaticAllPrivilegeGrants(allPrivilege, reservedPrivilege);
  applyAutomaticReadPrivilegeGrants(readPrivilege);

  return feature;
}

function applyAutomaticAllPrivilegeGrants(...allPrivileges: Array<FeatureKibanaPrivileges | null>) {
  allPrivileges.forEach(allPrivilege => {
    if (allPrivilege) {
      allPrivilege.savedObject.all = uniq([...allPrivilege.savedObject.all, 'telemetry']);
      allPrivilege.savedObject.read = uniq([...allPrivilege.savedObject.read, 'config', 'url']);
    }
  });
}

function applyAutomaticReadPrivilegeGrants(
  ...readPrivileges: Array<FeatureKibanaPrivileges | null>
) {
  readPrivileges.forEach(readPrivilege => {
    if (readPrivilege) {
      readPrivilege.savedObject.read = uniq([...readPrivilege.savedObject.read, 'config', 'url']);
    }
  });
}
