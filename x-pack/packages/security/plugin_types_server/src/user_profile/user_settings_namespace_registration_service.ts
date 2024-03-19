/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface UserSettingsNamespaceRegistrationService {
  /*
   * List of registered namespaces
   * */
  registeredNamespaces: string[];

  /**
   * Register a namespace
   * @param namespace - namespace to register
   *
   * @returns void
   */
  registerNamespace(namespace: string): void;

  /**
   *
   * @returns list of registered namespaces
   *
   */
  getRegisteredNamespaces(): string[];
}

export type GetNamespaceRegistrationService = () => UserSettingsNamespaceRegistrationService;
