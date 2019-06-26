/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Notification Service represents a service that contains generic "actions", such as "Send to Email"
 * that are added at startup by plugins to enable notifications to be sent either by the user manually
 * or via the some scheduled / automated task.
 */
export class NotificationService {

  constructor() {
    this.actions = [];
  }

  /**
   * Add a new action to the action service.
   *
   * @param {Action} action An implementation of Action.
   */
  setAction = (action) => {
    this.removeAction(action.id);

    this.actions.push(action);
  }

  /**
   * Remove an existing action from the action service.
   *
   * @param {String} id The ID of the action to remove.
   * @return {Action} The action that was removed, or null.
   */
  removeAction = (id) => {
    const index = this.actions.findIndex(action => action.id === id);

    if (index !== -1) {
      const removedActions = this.actions.splice(index, 1);
      return removedActions[0];
    }

    return null;
  }

  /**
   * Get action with the specified {@code id}, if any.
   *
   * This is useful when you know that an action is provided, such as one provided by your own plugin,
   * and you want to use it to handle things in a consistent way.
   *
   * @param {String} id The ID of the Action.
   * @return {Action} The Action that matches the ID, or null.
   */
  getActionForId = (id) => {
    const index = this.actions.findIndex(action => action.id === id);

    if (index !== -1) {
      return this.actions[index];
    }

    return null;
  }

  /**
   * Get actions that will accept the {@code data}.
   *
   * @param {Object} data The data object to pass to actions.
   * @return {Array} An array of Actions that can be used with the data, if any. Empty if none.
   */
  getActionsForData = (data) => {
    return this.actions.filter(action => {
      try {
        return action.getMissingFields(data).length === 0;
      } catch (err) {
        return false;
      }
    });
  }

}

/**
 * A singleton reference to the notification service intended to be used across Kibana.
 */
export const notificationService = new NotificationService();
