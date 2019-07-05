/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionResult } from './action_result';

/**
 * Actions represent a singular, generic "action", such as "Send to Email".
 *
 * Note: Implementations of Action are inherently server-side operations. It may or may not be desiable to fire
 * these actions from the UI (triggering a server-side call), but these should be called for such a purpose.
 */
export class Action {

  /**
   * Create a new Action.
   *
   * The suggested ID is the name of the plugin that provides it, and the unique portion.
   * For example: "core-email" if core provided email.
   *
   * @param {Object} server The Kibana server object.
   * @param {String} id The unique identifier for the action.
   * @param {String} name User-friendly name for the action.
   */
  constructor({ server, id, name }) {
    this.server = server;
    this.id = id;
    this.name = name;
  }

  /**
   * Get the unique ID of the Action.
   *
   * @return {String}
   */
  getId() {
    return this.id;
  }

  /**
   * Get the user-friendly name of the Action.
   *
   * @return {String}
   */
  getName() {
    return this.name;
  }

  /**
   * Determine if this action can use the {@code notification}. This is useful if you use the action service
   * generically, such as using it from a generic UI.
   *
   * This is intended to be a simple check of the {@code notification}, rather than an asynchronous action.
   *
   * @param {Object} notification The notification data to use.
   * @return {Array} Array defining missing fields. Empty if none.
   */
  getMissingFields() {
    return [];
  }

  /**
   * Implementers must override to perform the health check.
   *
   * This should not be called directly outside of tests to ensure that any error is wrapped properly.
   *
   * Note: Some services do not provide consistent, reliable health checks, such as email. As such,
   * implementers must weigh the nature of false negatives versus the utility of having this check.
   *
   * @return {Promise} The result of the health check, which must be an {@code ActionResult}.
   * @throws {Error} if there is an unexpected failure occurs.
   */
  async doPerformHealthCheck() {
    throw new Error(`[doPerformHealthCheck] is not implemented for '${this.name}' action.`);
  }

  /**
   * Verify that the action can be used to the best of the ability of the service that it is using.
   *
   * @return {Promise} Always an {@code ActionResult}.
   */
  async performHealthCheck() {
    try {
      return await this.doPerformHealthCheck();
    } catch (error) {
      return new ActionResult({
        message: `Unable to perform '${this.name}' health check: ${error.message}.`,
        error
      });
    }
  }

  /**
   * Implementers must override to perform the action using the {@code notification}.
   *
   * This should not be called directly to ensure that any error is wrapped properly.
   *
   * @param {Object} notification The notification data to use.
   * @return {Promise} The result of the action, which must be a {@code ActionResult}.
   * @throws {Error} if the method is not implemented or an unexpected failure occurs.
   */
  async doPerformAction(notification) {
    throw new Error(`[doPerformAction] is not implemented for '${this.name}' action: ${JSON.stringify(notification)}`);
  }

  /**
   * Check to see if the current license allows actions.
   *
   * @return {Boolean} true when it is usable
   * @throws {Error} if there is an unexpected issue checking the license
   */
  isLicenseValid() {
    return this.server.plugins.xpack_main.info.license.isNotBasic();
  }

  /**
   * Perform the action using the {@code notification}.
   *
   * Actions automatically fail if the license check fails.
   *
   * Note to implementers: override doPerformAction instead of this method to help guarantee proper handling.
   *
   * @param {Object} notification The notification data to use.
   * @return {Promise} The result of the action, which must be a {@code ActionResult}.
   */
  async performAction(notification) {
    try {
      if (!this.isLicenseValid()) {
        throw new Error(`The current license does not allow '${this.name}' action.`);
      }

      return await this.doPerformAction(notification);
    } catch (error) {
      return new ActionResult({
        message: `Unable to perform '${this.name}' action: ${error.message}.`,
        error
      });
    }
  }

}
