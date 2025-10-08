/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import type { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { TaskCost } from '@kbn/task-manager-plugin/server';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { ActionType as CommonActionType } from '../common';
import { areValidFeatures } from '../common';
import type { ActionsConfigurationUtilities } from './actions_config';
import type { TaskRunnerFactory, ILicenseState, ActionExecutionSourceType } from './lib';
import { getActionTypeFeatureUsageName } from './lib';
import type {
  ActionType as ConnectorType,
  InMemoryConnector,
  ActionTypeConfig as ConnectorTypeConfig,
  ActionTypeSecrets as ConnectorTypeSecrets,
  ActionTypeParams as ConnectorTypeParams,
} from './types';

export interface ConnectorTypeRegistryOpts {
  licensing: LicensingPluginSetup;
  taskManager: TaskManagerSetupContract;
  taskRunnerFactory: TaskRunnerFactory;
  actionsConfigUtils: ActionsConfigurationUtilities;
  licenseState: ILicenseState;
  inMemoryConnectors: InMemoryConnector[];
}

export class ConnectorTypeRegistry {
  private readonly taskManager: TaskManagerSetupContract;
  private readonly connectorTypes: Map<string, ConnectorType> = new Map();
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private readonly actionsConfigUtils: ActionsConfigurationUtilities;
  private readonly licenseState: ILicenseState;
  private readonly inMemoryConnectors: InMemoryConnector[];
  private readonly licensing: LicensingPluginSetup;

  constructor(constructorParams: ConnectorTypeRegistryOpts) {
    this.taskManager = constructorParams.taskManager;
    this.taskRunnerFactory = constructorParams.taskRunnerFactory;
    this.actionsConfigUtils = constructorParams.actionsConfigUtils;
    this.licenseState = constructorParams.licenseState;
    this.inMemoryConnectors = constructorParams.inMemoryConnectors;
    this.licensing = constructorParams.licensing;
  }

  /**
   * Returns if the connector type registry has the given connector type registered
   */
  public has(id: string) {
    return this.connectorTypes.has(id);
  }

  /**
   * Throws error if connector type is not enabled.
   */
  public ensureActionTypeEnabled(id: string) {
    this.actionsConfigUtils.ensureActionTypeEnabled(id);
    // Important to happen last because the function will notify of feature usage at the
    // same time and it shouldn't notify when the action type isn't enabled
    this.licenseState.ensureLicenseForActionType(this.get(id));
  }

  /**
   * Returns true if connector type is enabled in the config and a valid license is used.
   */
  public isActionTypeEnabled(
    id: string,
    options: { notifyUsage: boolean } = { notifyUsage: false }
  ) {
    return (
      this.actionsConfigUtils.isActionTypeEnabled(id) &&
      this.licenseState.isLicenseValidForActionType(this.get(id), options).isValid === true
    );
  }

  /**
   * Returns true if connector type is enabled or preconfigured.
   * A connector type can be disabled but used with a preconfigured connector.
   * This does not apply to system connectors as those can be disabled.
   */
  public isActionExecutable(
    actionId: string,
    connectorTypeId: string,
    options: { notifyUsage: boolean } = { notifyUsage: false }
  ) {
    const validLicense = this.licenseState.isLicenseValidForActionType(
      this.get(connectorTypeId),
      options
    ).isValid;
    if (validLicense === false) return false;

    const connectorTypeEnabled = this.isActionTypeEnabled(connectorTypeId, options);
    const inMemoryConnector = this.inMemoryConnectors.find(
      (connector) => connector.id === actionId
    );

    return (
      connectorTypeEnabled ||
      (!connectorTypeEnabled &&
        (inMemoryConnector?.isPreconfigured === true || inMemoryConnector?.isSystemAction === true))
    );
  }

  /**
   * Returns true if the connector type is a system connector type
   */
  public isSystemActionType = (connectorTypeId: string): boolean =>
    Boolean(this.connectorTypes.get(connectorTypeId)?.isSystemActionType);

  /**
   * Returns true if the connector type has a sub-feature type defined
   */
  public hasSubFeature = (connectorTypeId: string): boolean =>
    Boolean(this.connectorTypes.get(connectorTypeId)?.subFeature);

  /**
   * Returns the kibana privileges
   */
  public getActionKibanaPrivileges<Params extends ConnectorTypeParams = ConnectorTypeParams>(
    connectorTypeId: string,
    params?: Params,
    source?: ActionExecutionSourceType
  ): string[] {
    const connectorType = this.connectorTypes.get(connectorTypeId);

    if (!connectorType?.isSystemActionType && !connectorType?.subFeature) {
      return [];
    }
    return connectorType?.getKibanaPrivileges?.({ params, source }) ?? [];
  }

  /**
   * Registers an action type to the action type registry
   */
  public register<
    Config extends ConnectorTypeConfig = ConnectorTypeConfig,
    Secrets extends ConnectorTypeSecrets = ConnectorTypeSecrets,
    Params extends ConnectorTypeParams = ConnectorTypeParams,
    ExecutorResultData = void
  >(connectorType: ConnectorType<Config, Secrets, Params, ExecutorResultData>) {
    if (this.has(connectorType.id)) {
      throw new Error(
        i18n.translate(
          'xpack.actions.actionTypeRegistry.register.duplicateActionTypeErrorMessage',
          {
            defaultMessage: 'Action type "{id}" is already registered.',
            values: {
              id: connectorType.id,
            },
          }
        )
      );
    }

    if (!connectorType.supportedFeatureIds || connectorType.supportedFeatureIds.length === 0) {
      throw new Error(
        i18n.translate('xpack.actions.actionTypeRegistry.register.missingSupportedFeatureIds', {
          defaultMessage:
            'At least one "supportedFeatureId" value must be supplied for connector type "{connectorTypeId}".',
          values: {
            connectorTypeId: connectorType.id,
          },
        })
      );
    }

    if (!areValidFeatures(connectorType.supportedFeatureIds)) {
      throw new Error(
        i18n.translate('xpack.actions.actionTypeRegistry.register.invalidConnectorFeatureIds', {
          defaultMessage: 'Invalid feature ids "{ids}" for connector type "{connectorTypeId}".',
          values: {
            connectorTypeId: connectorType.id,
            ids: connectorType.supportedFeatureIds.join(','),
          },
        })
      );
    }

    if (
      !connectorType.isSystemActionType &&
      !connectorType.subFeature &&
      connectorType.getKibanaPrivileges
    ) {
      throw new Error(
        i18n.translate('xpack.actions.actionTypeRegistry.register.invalidKibanaPrivileges', {
          defaultMessage:
            'Kibana privilege authorization is only supported for system actions and action types that are registered under a sub-feature',
        })
      );
    }

    const maxAttempts = this.actionsConfigUtils.getMaxAttempts({
      actionTypeId: connectorType.id,
      actionTypeMaxAttempts: connectorType.maxAttempts,
    });

    this.connectorTypes.set(connectorType.id, { ...connectorType } as unknown as ConnectorType);
    this.taskManager.registerTaskDefinitions({
      [`actions:${connectorType.id}`]: {
        title: connectorType.name,
        maxAttempts,
        cost: TaskCost.Tiny,
        createTaskRunner: (context: RunContext) => this.taskRunnerFactory.create(context),
      },
    });
    // No need to notify usage on basic action types
    if (connectorType.minimumLicenseRequired !== 'basic') {
      this.licensing.featureUsage.register(
        getActionTypeFeatureUsageName(connectorType as unknown as ConnectorType),
        connectorType.minimumLicenseRequired
      );
    }
  }

  /**
   * Returns an action type, throws if not registered
   */
  public get<
    Config extends ConnectorTypeConfig = ConnectorTypeConfig,
    Secrets extends ConnectorTypeSecrets = ConnectorTypeSecrets,
    Params extends ConnectorTypeParams = ConnectorTypeParams,
    ExecutorResultData = void
  >(id: string): ConnectorType<Config, Secrets, Params, ExecutorResultData> {
    if (!this.has(id)) {
      throw Boom.badRequest(
        i18n.translate('xpack.actions.actionTypeRegistry.get.missingActionTypeErrorMessage', {
          defaultMessage: 'Action type "{id}" is not registered.',
          values: {
            id,
          },
        })
      );
    }
    return this.connectorTypes.get(id)! as ConnectorType<
      Config,
      Secrets,
      Params,
      ExecutorResultData
    >;
  }

  /**
   * Returns a list of registered action types [{ id, name, enabled }], filtered by featureId if provided.
   */
  public list(featureId?: string): CommonActionType[] {
    return Array.from(this.connectorTypes)
      .filter(([_, connectorType]) => {
        return featureId ? connectorType.supportedFeatureIds.includes(featureId) : true;
      })
      .map(([connectorTypeId, connectorType]) => ({
        id: connectorTypeId,
        name: connectorType.name,
        minimumLicenseRequired: connectorType.minimumLicenseRequired,
        enabled: this.isActionTypeEnabled(connectorTypeId),
        enabledInConfig: this.actionsConfigUtils.isActionTypeEnabled(connectorTypeId),
        enabledInLicense: !!this.licenseState.isLicenseValidForActionType(connectorType).isValid,
        supportedFeatureIds: connectorType.supportedFeatureIds,
        isSystemActionType: !!connectorType.isSystemActionType,
        subFeature: connectorType.subFeature,
      }));
  }

  /**
   * Returns the actions configuration utilities
   */
  public getUtils(): ActionsConfigurationUtilities {
    return this.actionsConfigUtils;
  }

  public getAllTypes(): string[] {
    return [...this.list().map(({ id }) => id)];
  }
}
