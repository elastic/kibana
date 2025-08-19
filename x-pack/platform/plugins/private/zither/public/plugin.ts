/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type Logger } from '@kbn/logging';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { getServiceWorkerUrl } from '@kbn/serviceworker';

export class ZitherPublicPlugin implements Plugin {
  private readonly buildVersion: string;
  private readonly logger: Logger;
  private serviceWorker: ServiceWorker | null = null;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();

  constructor(ctx: PluginInitializerContext) {
    this.buildVersion = ctx.env.packageInfo.version;
    this.logger = ctx.logger.get();
  }

  public setup(core: CoreSetup) {
    // Setup logic
    this.initialize();
  }

  public start(core: CoreStart) {
    // Start logic
  }

  /**
   * Initialize service worker and setup communication
   */
  async initialize(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const serviceWorkerUrl = getServiceWorkerUrl(this.buildVersion);

      try {
        const registration = await navigator.serviceWorker.register(serviceWorkerUrl, {
          // install serviceworker on entire kibana application scope
          scope: '/',
        });

        this.serviceWorker = registration.active || registration.waiting || registration.installing;

        if (!this.serviceWorker) {
          await new Promise((resolve) => {
            registration.addEventListener('updatefound', () => {
              this.serviceWorker = registration.installing;
              this.serviceWorker?.addEventListener('statechange', () => {
                if (this.serviceWorker?.state === 'activated') {
                  resolve(void 0);
                }
              });
            });
          });
        }

        navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));
      } catch (error) {
        this.logger.error('Failed to register service worker:', error);
      }
    }
  }

  private handleMessage(event: MessageEvent): void {
    const { type, requestId, result, error } = event.data;

    if (type === 'TASK_RESULT' && requestId) {
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        pending.resolve(result);
        this.pendingRequests.delete(requestId);
      }
    } else if (type === 'TASK_ERROR' && requestId) {
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        pending.reject(new Error(error));
        this.pendingRequests.delete(requestId);
      }
    }
  }
}
