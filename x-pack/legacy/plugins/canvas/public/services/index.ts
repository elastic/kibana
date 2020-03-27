/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart } from '../../../../../../src/core/public';
import { CanvasSetupDeps, CanvasStartDeps } from '../plugin';
import { notifyServiceFactory } from './notify';

export type CanvasServiceFactory<Service> = (
  coreSetup: CoreSetup,
  coreStart: CoreStart,
  canvasSetupPlugins: CanvasSetupDeps,
  canvasStartPlugins: CanvasStartDeps
) => Service;

class CanvasServiceProvider<Service> {
  private factory: CanvasServiceFactory<Service>;
  private service: Service | undefined;

  constructor(factory: CanvasServiceFactory<Service>) {
    this.factory = factory;
  }

  start(
    coreSetup: CoreSetup,
    coreStart: CoreStart,
    canvasSetupPlugins: CanvasSetupDeps,
    canvasStartPlugins: CanvasStartDeps
  ) {
    this.service = this.factory(coreSetup, coreStart, canvasSetupPlugins, canvasStartPlugins);
  }

  getService(): Service {
    if (!this.service) {
      throw new Error('Service not ready');
    }

    return this.service;
  }

  stop() {
    this.service = undefined;
  }
}

const services: Array<CanvasServiceProvider<any>> = [];

const notifyService = new CanvasServiceProvider(notifyServiceFactory);

services.push(notifyService);

export const startServices = (
  coreSetup: CoreSetup,
  coreStart: CoreStart,
  canvasSetupPlugins: CanvasSetupDeps,
  canvasStartPlugins: CanvasStartDeps
) => {
  services.forEach(provider =>
    provider.start(coreSetup, coreStart, canvasSetupPlugins, canvasStartPlugins)
  );
};

export const stopServices = () => services.forEach(provider => provider.stop());

export { startServices, stopServices, notifyService };
