/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BehaviorSubject } from 'rxjs';
import { type Logger } from '@kbn/logging';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { getServiceWorkerUrl } from '@kbn/serviceworker';
import { CreateServiceWorkerMLCEngine } from '@mlc-ai/web-llm';

export class ZitherPublicPlugin implements Plugin {
  private readonly buildVersion: string;
  private readonly logger: Logger;
  private serviceWorker: ServiceWorker | null = null;
  private readonly state = new BehaviorSubject<ServiceWorkerState | null>(null);

  constructor(ctx: PluginInitializerContext) {
    this.buildVersion = ctx.env.packageInfo.version;
    this.logger = ctx.logger.get();
  }

  public setup(core: CoreSetup) {
    // Setup logic
    this.initialize();

    return {};
  }

  public start(core: CoreStart) {
    return {
      state: this.state.asObservable(),
      mlcEngine: CreateServiceWorkerMLCEngine,
    };
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

        // persist current install state
        this.setServiceWorkerState();

        // set up handler to propagate state changes
        this.serviceWorker?.addEventListener('statechange', this.setServiceWorkerState.bind(this));

        if (!this.serviceWorker) {
          await new Promise((resolve) => {
            registration.addEventListener('updatefound', () => {
              this.serviceWorker = registration.installing;
              this.serviceWorker?.addEventListener('statechange', () => {
                this.setServiceWorkerState();
                if (this.serviceWorker?.state === 'activated') {
                  resolve(void 0);
                }
              });
            });
          });
        }
      } catch (error) {
        this.logger.error('Failed to register service worker:', error);
      }
    }
  }

  private setServiceWorkerState(): void {
    // persist current install state, we check if there's a controller because of where hard refresh
    // causes the page not to be controlled, {@see https://www.w3.org/TR/service-workers/#navigator-service-worker-controller}
    this.state.next(navigator.serviceWorker.controller ? this.serviceWorker?.state || null : null);
  }
}

export type ZitherPublicPluginStart = ReturnType<ZitherPublicPlugin['start']>;

export type ZitherPublicPluginSetup = ReturnType<ZitherPublicPlugin['setup']>;
