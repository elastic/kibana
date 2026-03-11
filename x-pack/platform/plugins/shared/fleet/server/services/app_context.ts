/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { kibanaPackageJson } from '@kbn/repo-info';

import type { HttpServiceSetup, KibanaRequest } from '@kbn/core-http-server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type {
  EncryptedSavedObjectsClient,
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { SecurityPluginStart, SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { SavedObjectTaggingStart } from '@kbn/saved-objects-tagging-plugin/server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import { SPACES_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { Logger } from '@kbn/logging';
import type { LockManagerService } from '@kbn/lock-manager';
import type { AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { ReportingStart } from '@kbn/reporting-plugin/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';

import type { FleetConfigType } from '../../common/types';
import {
  allowedExperimentalValues,
  type ExperimentalFeatures,
} from '../../common/experimental_features';
import type {
  ExternalCallback,
  ExternalCallbacksStorage,
  PostPackagePolicyDeleteCallback,
  PostPackagePolicyCreateCallback,
  PostPackagePolicyPostDeleteCallback,
  PostPackagePolicyPostCreateCallback,
  PutPackagePolicyUpdateCallback,
  PostAgentPolicyCreateCallback,
  PostAgentPolicyUpdateCallback,
} from '../types';
import { KibanaSavedObjectType } from '../types';
import type { FleetAppContext } from '../plugin';
import type { TelemetryEventsSender } from '../telemetry/sender';
import { UNINSTALL_TOKENS_SAVED_OBJECT_TYPE } from '../constants';
import type { MessageSigningServiceInterface } from '..';
import type { FleetUsage } from '../collectors/register';

import type { BulkActionsResolver } from './agents/bulk_actions_resolver';
import { type UninstallTokenServiceInterface } from './security/uninstall_token_service';

class AppContextService {
  private encryptedSavedObjects: EncryptedSavedObjectsClient | undefined;
  private encryptedSavedObjectsSetup: EncryptedSavedObjectsPluginSetup | undefined;
  private encryptedSavedObjectsStart: EncryptedSavedObjectsPluginStart | undefined;
  private data: DataPluginStart | undefined;
  private esClient: ElasticsearchClient | undefined;
  private experimentalFeatures: ExperimentalFeatures = allowedExperimentalValues;
  private securityCoreStart: SecurityServiceStart | undefined;
  private securitySetup: SecurityPluginSetup | undefined;
  private securityStart: SecurityPluginStart | undefined;
  private config$?: Observable<FleetConfigType>;
  private configSubject$?: BehaviorSubject<FleetConfigType>;
  private savedObjects: SavedObjectsServiceStart | undefined;
  private isProductionMode: FleetAppContext['isProductionMode'] = false;
  private kibanaVersion: FleetAppContext['kibanaVersion'] = kibanaPackageJson.version;
  private kibanaBranch: FleetAppContext['kibanaBranch'] = kibanaPackageJson.branch;
  private kibanaInstanceId: FleetAppContext['kibanaInstanceId'] = '';
  private cloud?: CloudSetup;
  private logger: Logger | undefined;
  private httpSetup?: HttpServiceSetup;
  private externalCallbacks: ExternalCallbacksStorage = new Map();
  private telemetryEventsSender: TelemetryEventsSender | undefined;
  private savedObjectsTagging: SavedObjectTaggingStart | undefined;
  private bulkActionsResolver: BulkActionsResolver | undefined;
  private messageSigningService: MessageSigningServiceInterface | undefined;
  private uninstallTokenService: UninstallTokenServiceInterface | undefined;
  private taskManagerStart: TaskManagerStartContract | undefined;
  private fetchUsage?: (abortController: AbortController) => Promise<FleetUsage | undefined>;
  private lockManagerService: LockManagerService | undefined;
  private alertingStart: AlertingServerStart | undefined;
  private includedHiddenTypes: string[] = [
    UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
    KibanaSavedObjectType.alertingRuleTemplate,
    KibanaSavedObjectType.sloTemplate,
  ];
  private reportingStart: ReportingStart | undefined;

  public start(appContext: FleetAppContext) {
    this.data = appContext.data;
    this.esClient = appContext.elasticsearch.client.asInternalUser;
    this.encryptedSavedObjectsStart = appContext.encryptedSavedObjectsStart;
    this.encryptedSavedObjects = appContext.encryptedSavedObjectsStart?.getClient();
    this.encryptedSavedObjectsSetup = appContext.encryptedSavedObjectsSetup;
    this.securityCoreStart = appContext.securityCoreStart;
    this.securitySetup = appContext.securitySetup;
    this.securityStart = appContext.securityStart;
    this.savedObjects = appContext.savedObjects;
    this.experimentalFeatures = appContext.experimentalFeatures;
    this.isProductionMode = appContext.isProductionMode;
    this.cloud = appContext.cloud;
    this.logger = appContext.logger;
    this.kibanaVersion = appContext.kibanaVersion;
    this.kibanaBranch = appContext.kibanaBranch;
    this.kibanaInstanceId = appContext.kibanaInstanceId;
    this.httpSetup = appContext.httpSetup;
    this.telemetryEventsSender = appContext.telemetryEventsSender;
    this.savedObjectsTagging = appContext.savedObjectsTagging;
    this.bulkActionsResolver = appContext.bulkActionsResolver;
    this.messageSigningService = appContext.messageSigningService;
    this.uninstallTokenService = appContext.uninstallTokenService;
    this.taskManagerStart = appContext.taskManagerStart;
    this.fetchUsage = appContext.fetchUsage;
    this.lockManagerService = appContext.lockManagerService;
    this.alertingStart = appContext.alertingStart;
    this.reportingStart = appContext.reportingStart;

    if (appContext.config$) {
      this.config$ = appContext.config$;
      const initialValue = appContext.configInitialValue;
      this.configSubject$ = new BehaviorSubject(initialValue);
      this.config$.subscribe(this.configSubject$);
    }
  }

  public stop() {
    this.externalCallbacks.clear();
  }

  public getData() {
    if (!this.data) {
      throw new Error('Data start service not set.');
    }
    return this.data;
  }

  public getEncryptedSavedObjects() {
    if (!this.encryptedSavedObjects) {
      throw new Error('Encrypted saved object start service not set.');
    }
    return this.encryptedSavedObjects;
  }

  public getSecurityCore() {
    return this.securityCoreStart!;
  }

  public getSecurity() {
    return this.securityStart!;
  }

  public getSecuritySetup() {
    return this.securitySetup!;
  }

  public getSecurityLicense() {
    return this.securitySetup!.license;
  }

  public getCloud() {
    return this.cloud;
  }

  public getLogger() {
    if (!this.logger) {
      throw new Error('Logger not set.');
    }
    return this.logger;
  }

  public getConfig() {
    return this.configSubject$?.value;
  }

  public getConfig$() {
    return this.config$;
  }

  public getExperimentalFeatures() {
    return this.experimentalFeatures;
  }

  public getSavedObjects() {
    if (!this.savedObjects) {
      throw new Error('Saved objects start service not set.');
    }
    return this.savedObjects;
  }

  public getSavedObjectsTagging() {
    if (!this.savedObjectsTagging) {
      throw new Error('Saved object tagging start service not set.');
    }
    return this.savedObjectsTagging;
  }
  public getInternalUserSOClientForSpaceId(spaceId?: string) {
    // soClient as kibana internal users, be careful on how you use it, security is not enabled
    if (spaceId && spaceId !== DEFAULT_SPACE_ID && spaceId !== ALL_SPACES_ID) {
      return appContextService
        .getSavedObjects()
        .getUnsafeInternalClient({
          includedHiddenTypes: this.includedHiddenTypes,
        })
        .asScopedToNamespace(spaceId);
    }
    return this.getInternalUserSOClientWithoutSpaceExtension();
  }

  public getInternalUserSOClient(request?: KibanaRequest) {
    if (request) {
      return appContextService.getSavedObjects().getScopedClient(request, {
        includedHiddenTypes: this.includedHiddenTypes,
      });
    }

    return appContextService.getSavedObjects().getUnsafeInternalClient({
      includedHiddenTypes: this.includedHiddenTypes,
    });
  }

  public getInternalUserSOClientWithoutSpaceExtension() {
    // soClient as kibana internal users, be careful on how you use it, security is not enabled
    return appContextService.getSavedObjects().getUnsafeInternalClient({
      excludedExtensions: [SPACES_EXTENSION_ID],
      includedHiddenTypes: this.includedHiddenTypes,
    });
  }

  public getInternalUserESClient() {
    if (!this.esClient) {
      throw new Error('Elasticsearch start service not set.');
    }
    // soClient as kibana internal users, be careful on how you use it, security is not enabled
    return this.esClient;
  }

  public getIsProductionMode() {
    return this.isProductionMode;
  }

  public getHttpSetup() {
    if (!this.httpSetup) {
      throw new Error('HttpServiceSetup not set.');
    }
    return this.httpSetup;
  }

  public getEncryptedSavedObjectsSetup() {
    return this.encryptedSavedObjectsSetup;
  }

  public getEncryptedSavedObjectsStart() {
    return this.encryptedSavedObjectsStart;
  }

  public getKibanaVersion() {
    return this.kibanaVersion;
  }

  public getKibanaBranch() {
    return this.kibanaBranch;
  }

  public getKibanaInstanceId() {
    return this.kibanaInstanceId;
  }

  public getTaskManagerStart() {
    return this.taskManagerStart;
  }

  public addExternalCallback(type: ExternalCallback[0], callback: ExternalCallback[1]) {
    if (!this.externalCallbacks.has(type)) {
      this.externalCallbacks.set(type, new Set());
    }
    this.externalCallbacks.get(type)!.add(callback);
  }

  public getExternalCallbacks<T extends ExternalCallback[0]>(
    type: T
  ):
    | Set<
        T extends 'agentPolicyCreate'
          ? PostAgentPolicyCreateCallback
          : T extends 'agentPolicyUpdate'
          ? PostAgentPolicyUpdateCallback
          : T extends 'packagePolicyCreate'
          ? PostPackagePolicyCreateCallback
          : T extends 'packagePolicyDelete'
          ? PostPackagePolicyDeleteCallback
          : T extends 'packagePolicyPostDelete'
          ? PostPackagePolicyPostDeleteCallback
          : T extends 'packagePolicyPostCreate'
          ? PostPackagePolicyPostCreateCallback
          : PutPackagePolicyUpdateCallback
      >
    | undefined {
    if (this.externalCallbacks) {
      return this.externalCallbacks.get(type) as Set<
        T extends 'agentPolicyCreate'
          ? PostAgentPolicyCreateCallback
          : T extends 'agentPolicyUpdate'
          ? PostAgentPolicyUpdateCallback
          : T extends 'packagePolicyCreate'
          ? PostPackagePolicyCreateCallback
          : T extends 'packagePolicyDelete'
          ? PostPackagePolicyDeleteCallback
          : T extends 'packagePolicyPostDelete'
          ? PostPackagePolicyPostDeleteCallback
          : T extends 'packagePolicyPostCreate'
          ? PostPackagePolicyPostCreateCallback
          : PutPackagePolicyUpdateCallback
      >;
    }
  }

  public getTelemetryEventsSender() {
    return this.telemetryEventsSender;
  }

  public getBulkActionsResolver() {
    return this.bulkActionsResolver;
  }

  public getMessageSigningService() {
    return this.messageSigningService;
  }

  public getUninstallTokenService() {
    return this.uninstallTokenService;
  }

  public getFetchUsage() {
    return this.fetchUsage;
  }

  public getLockManagerService() {
    return this.lockManagerService;
  }

  public getAlertingStart() {
    return this.alertingStart;
  }

  public getReportingStart() {
    return this.reportingStart;
  }
}

export const appContextService = new AppContextService();
