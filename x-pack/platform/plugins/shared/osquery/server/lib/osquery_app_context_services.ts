/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, LoggerFactory } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  AgentService,
  FleetStartContract,
  PackageService,
  AgentPolicyServiceInterface,
  PackagePolicyClient,
} from '@kbn/fleet-plugin/server';
import type { RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { FleetActionsClientInterface } from '@kbn/fleet-plugin/server/services/actions';
import type { ConfigType } from '../../common/config';
import type { TelemetryEventsSender } from './telemetry/sender';

export type OsqueryAppContextServiceStartContract = Partial<
  Pick<
    FleetStartContract,
    | 'agentService'
    | 'packageService'
    | 'packagePolicyService'
    | 'agentPolicyService'
    | 'createFleetActionsClient'
  >
> & {
  logger: Logger;
  config: ConfigType;
  registerIngestCallback?: FleetStartContract['registerExternalCallback'];
  ruleRegistryService?: RuleRegistryPluginStartContract;
};

/**
 * A singleton that holds shared services that are initialized during the start up phase
 * of the plugin lifecycle. And stop during the stop phase, if needed.
 */
export class OsqueryAppContextService {
  private agentService: AgentService | undefined;
  private packageService: PackageService | undefined;
  private packagePolicyService: PackagePolicyClient | undefined;
  private agentPolicyService: AgentPolicyServiceInterface | undefined;
  private ruleRegistryService: RuleRegistryPluginStartContract | undefined;
  private fleetActionsClient: FleetActionsClientInterface | undefined;

  public start(dependencies: OsqueryAppContextServiceStartContract) {
    this.agentService = dependencies.agentService;
    this.packageService = dependencies.packageService;
    this.packagePolicyService = dependencies.packagePolicyService;
    this.agentPolicyService = dependencies.agentPolicyService;
    this.ruleRegistryService = dependencies.ruleRegistryService;
    this.fleetActionsClient = dependencies.createFleetActionsClient?.('osquery');
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public stop() {}

  public getAgentService(): AgentService | undefined {
    return this.agentService;
  }

  public getPackageService(): PackageService | undefined {
    return this.packageService;
  }

  public getPackagePolicyService(): PackagePolicyClient | undefined {
    return this.packagePolicyService;
  }

  public getAgentPolicyService(): AgentPolicyServiceInterface | undefined {
    return this.agentPolicyService;
  }

  public getRuleRegistryService(): RuleRegistryPluginStartContract | undefined {
    return this.ruleRegistryService;
  }

  public getFleetActionsClient(): FleetActionsClientInterface | undefined {
    return this.fleetActionsClient;
  }
}

/**
 * The context for Osquery app.
 */
export interface OsqueryAppContext {
  logFactory: LoggerFactory;
  config(): ConfigType;
  security: SecurityPluginStart;
  getStartServices: CoreSetup['getStartServices'];
  telemetryEventsSender: TelemetryEventsSender;
  licensing: LicensingPluginSetup;
  /**
   * Object readiness is tied to plugin start method
   */
  service: OsqueryAppContextService;
}
