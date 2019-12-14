/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, uniq } from 'lodash';

export class SecureSavedObjectsClientWrapper {
  constructor(options) {
    const {
      actions,
      auditLogger,
      baseClient,
      checkSavedObjectsPrivilegesWithRequest,
      errors,
      request,
      savedObjectTypes,
    } = options;

    this.errors = errors;
    this._actions = actions;
    this._auditLogger = auditLogger;
    this._baseClient = baseClient;
    this._checkSavedObjectsPrivileges = checkSavedObjectsPrivilegesWithRequest(request);
    this._savedObjectTypes = savedObjectTypes;
  }

  async create(type, attributes = {}, options = {}) {
    await this._ensureAuthorized(type, 'create', options.namespace, { type, attributes, options });

    return await this._baseClient.create(type, attributes, options);
  }

  async bulkCreate(objects, options = {}) {
    const types = uniq(objects.map(o => o.type));
    await this._ensureAuthorized(types, 'bulk_create', options.namespace, { objects, options });

    return await this._baseClient.bulkCreate(objects, options);
  }

  async delete(type, id, options = {}) {
    await this._ensureAuthorized(type, 'delete', options.namespace, { type, id, options });

    return await this._baseClient.delete(type, id, options);
  }

  async find(options = {}) {
    await this._ensureAuthorized(options.type, 'find', options.namespace, { options });

    return this._baseClient.find(options);
  }

  async bulkGet(objects = [], options = {}) {
    const types = uniq(objects.map(o => o.type));
    await this._ensureAuthorized(types, 'bulk_get', options.namespace, { objects, options });

    return await this._baseClient.bulkGet(objects, options);
  }

  async get(type, id, options = {}) {
    await this._ensureAuthorized(type, 'get', options.namespace, { type, id, options });

    return await this._baseClient.get(type, id, options);
  }

  async update(type, id, attributes, options = {}) {
    await this._ensureAuthorized(type, 'update', options.namespace, {
      type,
      id,
      attributes,
      options,
    });

    return await this._baseClient.update(type, id, attributes, options);
  }

  async _checkPrivileges(actions, namespace) {
    try {
      return await this._checkSavedObjectsPrivileges(actions, namespace);
    } catch (error) {
      const { reason } = get(error, 'body.error', {});
      throw this.errors.decorateGeneralError(error, reason);
    }
  }

  async _ensureAuthorized(typeOrTypes, action, namespace, args) {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
    const actionsToTypesMap = new Map(
      types.map(type => [this._actions.savedObject.get(type, action), type])
    );
    const actions = Array.from(actionsToTypesMap.keys());
    const { hasAllRequested, username, privileges } = await this._checkPrivileges(
      actions,
      namespace
    );

    if (hasAllRequested) {
      this._auditLogger.savedObjectsAuthorizationSuccess(username, action, types, args);
    } else {
      const missingPrivileges = this._getMissingPrivileges(privileges);
      this._auditLogger.savedObjectsAuthorizationFailure(
        username,
        action,
        types,
        missingPrivileges,
        args
      );
      const msg = `Unable to ${action} ${missingPrivileges
        .map(privilege => actionsToTypesMap.get(privilege))
        .sort()
        .join(',')}`;
      throw this.errors.decorateForbiddenError(new Error(msg));
    }
  }

  _getMissingPrivileges(response) {
    return Object.keys(response).filter(privilege => !response[privilege]);
  }
}
