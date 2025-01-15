/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { InstallationStatus } from '../../../common/install_status';

/**
 * APIs to manage the product documentation.
 */
export interface DocumentationManagerAPI {
  /**
   * Install the product documentation.
   * By default, will only try to install if not already present.
   * Can use the `force` option to forcefully reinstall.
   */
  install(options?: DocInstallOptions): Promise<void>;
  /**
   * Update the product documentation to the latest version.
   * No-op if the product documentation is not currently installed.
   */
  update(options?: DocUpdateOptions): Promise<void>;
  /**
   * Uninstall the product documentation.
   * No-op if the product documentation is not currently installed.
   */
  uninstall(options?: DocUninstallOptions): Promise<void>;
  /**
   * Returns the overall installation status of the documentation.
   */
  getStatus(): Promise<DocGetStatusResponse>;
}

/**
 * Return type for {@link DocumentationManagerAPI.getStatus}
 */
export interface DocGetStatusResponse {
  status: InstallationStatus;
}

/**
 * Options for {@link DocumentationManagerAPI.install}
 */
export interface DocInstallOptions {
  /**
   * When the operation was requested by a user, the request that initiated it.
   *
   * If not provided, the call will be considered as being done on behalf of system.
   */
  request?: KibanaRequest;
  /**
   * If true, will reinstall the documentation even if already present.
   * Defaults to `false`
   */
  force?: boolean;
  /**
   * If true, the returned promise will wait until the update task has completed before resolving.
   * Defaults to `false`
   */
  wait?: boolean;
}

/**
 * Options for {@link DocumentationManagerAPI.uninstall}
 */
export interface DocUninstallOptions {
  /**
   * When the operation was requested by a user, the request that initiated it.
   *
   * If not provided, the call will be considered as being done on behalf of system.
   */
  request?: KibanaRequest;
  /**
   * If true, the returned promise will wait until the update task has completed before resolving.
   * Defaults to `false`
   */
  wait?: boolean;
}

/**
 * Options for {@link DocumentationManagerAPI.update}
 */
export interface DocUpdateOptions {
  /**
   * When the operation was requested by a user, the request that initiated it.
   *
   * If not provided, the call will be considered as being done on behalf of system.
   */
  request?: KibanaRequest;
  /**
   * If true, the returned promise will wait until the update task has completed before resolving.
   * Defaults to `false`
   */
  wait?: boolean;
}
