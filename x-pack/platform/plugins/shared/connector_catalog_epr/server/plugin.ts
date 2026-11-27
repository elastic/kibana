/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';
import { performance } from 'perf_hooks';
import { schema } from '@kbn/config-schema';
import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import { createEprCatalogSource } from './catalog_source';
import type { ConnectorCatalogEprConfig } from './config';
import {
  downloadBuffer,
  listPackageVersions,
  readConnectorSpecs,
  verifyZipSignature,
} from './epr_client';

export interface ConnectorCatalogEprPluginSetupDeps {
  actions: ActionsPluginSetupContract;
}

export class ConnectorCatalogEprPlugin
  implements Plugin<void, void, ConnectorCatalogEprPluginSetupDeps>
{
  private readonly logger: Logger;
  private readonly config: ConnectorCatalogEprConfig;
  private readonly kibanaVersion: string;

  constructor(initializerContext: PluginInitializerContext<ConnectorCatalogEprConfig>) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup, plugins: ConnectorCatalogEprPluginSetupDeps) {
    plugins.actions.registerConnectorCatalogSource(
      createEprCatalogSource({
        config: this.config,
        kibanaVersion: this.kibanaVersion,
        logger: this.logger,
      })
    );

    const router = core.http.createRouter();
    router.get(
      {
        path: '/internal/connector_catalog_epr/fetch',
        security: { authz: { enabled: false, reason: 'PoC route, read only, no stored data' } },
        options: { access: 'internal' },
        validate: {
          query: schema.object({
            packageName: schema.maybe(schema.string({ maxLength: 256 })),
            version: schema.maybe(schema.string({ maxLength: 64 })),
            kibanaVersion: schema.maybe(schema.string({ maxLength: 64 })),
          }),
        },
      },
      async (context, request, response) => {
        const { registryUrl, publicKeyPath } = this.config;
        const packageName = request.query.packageName ?? this.config.packageName;
        const { version, kibanaVersion } = request.query;
        try {
          const startList = performance.now();
          const versions = await listPackageVersions({ registryUrl, packageName, kibanaVersion });
          const listMs = performance.now() - startList;

          const selected = version
            ? versions.find((item) => item.version === version)
            : versions[versions.length - 1];
          if (!selected) {
            return response.notFound({
              body: { message: `Version ${version ?? '(latest)'} of ${packageName} not found` },
            });
          }

          const startDownload = performance.now();
          const zip = await downloadBuffer(registryUrl, selected.download);
          const downloadMs = performance.now() - startDownload;

          let signature: { verified: boolean; keyId: string; error?: string } | undefined;
          let verifyMs: number | undefined;
          if (publicKeyPath && selected.signaturePath) {
            const armoredSignature = (
              await downloadBuffer(registryUrl, selected.signaturePath)
            ).toString('utf8');
            const armoredPublicKey = await readFile(publicKeyPath, 'utf8');
            const startVerify = performance.now();
            signature = await verifyZipSignature({ zip, armoredSignature, armoredPublicKey });
            verifyMs = performance.now() - startVerify;
          }

          const startParse = performance.now();
          const specs = await readConnectorSpecs(zip);
          const parseMs = performance.now() - startParse;

          this.logger.info(
            `Fetched ${selected.name}-${selected.version} from ${registryUrl}: ${zip.length} bytes, ${specs.length} specs`
          );

          return response.ok({
            body: {
              registryUrl,
              runningKibanaVersion: this.kibanaVersion,
              versions,
              selected,
              zipBytes: zip.length,
              signature,
              specCount: specs.length,
              specs: specs
                .slice(0, 5)
                .map(({ path, connectorType, specVersion, yamlBytes, spec }) => ({
                  path,
                  connectorType,
                  specVersion,
                  yamlBytes,
                  id: spec.id,
                  version: spec.version,
                  actions: Object.keys((spec.actions as Record<string, unknown>) ?? {}),
                })),
              timingsMs: { list: listMs, download: downloadMs, verify: verifyMs, parse: parseMs },
            },
          });
        } catch (error) {
          this.logger.warn(`EPR fetch failed: ${(error as Error).message}`);
          return response.customError({
            statusCode: 502,
            body: { message: (error as Error).message },
          });
        }
      }
    );
  }

  public start() {
    this.logger.info(
      `connectorCatalogEpr started, registryUrl=${this.config.registryUrl}, package=${this.config.packageName}`
    );
  }

  public stop() {}
}
