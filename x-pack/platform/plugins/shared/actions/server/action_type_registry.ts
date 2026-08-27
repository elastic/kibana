/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { TaskCost } from '@kbn/task-manager-plugin/server';
import { TaskTypeGroup } from '@kbn/task-manager-plugin/server/task';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';
import type { ActionType as CommonActionType } from '../common';
import { areValidFeatures, MAX_FEATURE_ID_LENGTH } from '../common';
import type { ActionsConfigurationUtilities } from './actions_config';
import type { ActionExecutionSourceType, ILicenseState, TaskRunnerFactory } from './lib';
import { getActionTypeFeatureUsageName } from './lib';
import type {
  ActionType,
  ActionTypeConfig,
  ActionTypeParams,
  ActionTypeSecrets,
  InMemoryConnector,
} from './types';

export interface ActionTypeRegistryOpts {
  licensing: LicensingPluginSetup;
  taskManager: TaskManagerSetupContract;
  taskRunnerFactory: TaskRunnerFactory;
  actionsConfigUtils: ActionsConfigurationUtilities;
  licenseState: ILicenseState;
  inMemoryConnectors: InMemoryConnector[];
}

interface ListOpts {
  featureId?: string;
  exposeValidation?: boolean;
  exposeSpecActions?: boolean;
}

interface RegisteredActionTypeResolution {
  registeredActionTypeId: string;
  actionType: ActionType;
  connectorSpec?: ConnectorSpec;
  specId?: undefined;
}

interface VirtualActionTypeResolution {
  registeredActionTypeId: string;
  actionType: ActionType;
  connectorSpec: ConnectorSpec;
  specId: string;
}

export type ResolvedActionType = RegisteredActionTypeResolution | VirtualActionTypeResolution;

const serializeActionSchemas = (
  connectorSpec: ConnectorSpec
): Record<string, Record<string, unknown>> =>
  Object.fromEntries(
    Object.entries(connectorSpec.actions).map(([name, action]) => [
      name,
      z.toJSONSchema(action.input, { io: 'input', unrepresentable: 'any' }),
    ])
  );

export class ActionTypeRegistry {
  private readonly taskManager: TaskManagerSetupContract;
  private readonly actionTypes: Map<string, ActionType> = new Map();
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private readonly actionsConfigUtils: ActionsConfigurationUtilities;
  private readonly licenseState: ILicenseState;
  private readonly inMemoryConnectors: InMemoryConnector[];
  private readonly licensing: LicensingPluginSetup;

  constructor(constructorParams: ActionTypeRegistryOpts) {
    this.taskManager = constructorParams.taskManager;
    this.taskRunnerFactory = constructorParams.taskRunnerFactory;
    this.actionsConfigUtils = constructorParams.actionsConfigUtils;
    this.licenseState = constructorParams.licenseState;
    this.inMemoryConnectors = constructorParams.inMemoryConnectors;
    this.licensing = constructorParams.licensing;
  }

  /**
   * Returns if the action type registry has the given action type registered
   */
  public has(id: string) {
    return this.actionTypes.has(id);
  }

  /**
   * Throws error if action type is not enabled.
   */
  public ensureActionTypeEnabled(id: string, version?: string) {
    const { registeredActionTypeId, actionType, connectorSpec } = this.resolveActionType(
      id,
      version
    );
    this.actionsConfigUtils.ensureActionTypeEnabled(registeredActionTypeId);
    // Important to happen last because the function will notify of feature usage at the
    // same time and it shouldn't notify when the action type isn't enabled
    this.licenseState.ensureLicenseForActionType(
      connectorSpec
        ? { ...actionType, minimumLicenseRequired: connectorSpec.metadata.minimumLicense }
        : actionType
    );
  }

  /**
   * Returns true if action type is enabled in the config and a valid license is used.
   */
  public isActionTypeEnabled(
    id: string,
    options: { notifyUsage: boolean } = { notifyUsage: false },
    version?: string
  ) {
    const { registeredActionTypeId, actionType, connectorSpec } = this.resolveActionType(
      id,
      version
    );
    const actionTypeForLicense = connectorSpec
      ? { ...actionType, minimumLicenseRequired: connectorSpec.metadata.minimumLicense }
      : actionType;
    return (
      this.actionsConfigUtils.isActionTypeEnabled(registeredActionTypeId) &&
      this.licenseState.isLicenseValidForActionType(actionTypeForLicense, options).isValid === true
    );
  }

  /**
   * Returns true if action type is enabled or preconfigured.
   * An action type can be disabled but used with a preconfigured action.
   * This does not apply to system actions as those can be disabled.
   */
  public isActionExecutable(
    actionId: string,
    actionTypeId: string,
    options: { notifyUsage: boolean } = { notifyUsage: false },
    version?: string
  ) {
    const { actionType, connectorSpec } = this.resolveActionType(actionTypeId, version);
    const validLicense = this.licenseState.isLicenseValidForActionType(
      connectorSpec
        ? { ...actionType, minimumLicenseRequired: connectorSpec.metadata.minimumLicense }
        : actionType,
      options
    ).isValid;
    if (validLicense === false) return false;

    const actionTypeEnabled = this.isActionTypeEnabled(actionTypeId, options, version);
    const inMemoryConnector = this.inMemoryConnectors.find(
      (connector) => connector.id === actionId
    );

    return (
      actionTypeEnabled ||
      (!actionTypeEnabled &&
        (inMemoryConnector?.isPreconfigured === true || inMemoryConnector?.isSystemAction === true))
    );
  }

  /**
   * Returns true if the action type is a system action type
   */
  public isSystemActionType = (actionTypeId: string): boolean =>
    Boolean(this.actionTypes.get(actionTypeId)?.isSystemActionType);

  /**
   * Returns true if the connector type has a sub-feature type defined
   */
  public hasSubFeature = (actionTypeId: string): boolean =>
    Boolean(this.actionTypes.get(actionTypeId)?.subFeature);

  /**
   * Returns the kibana privileges
   */
  public getActionKibanaPrivileges<Params extends ActionTypeParams = ActionTypeParams>(
    actionTypeId: string,
    params?: Params,
    source?: ActionExecutionSourceType
  ): string[] {
    const actionType = this.actionTypes.get(actionTypeId);

    if (!actionType?.isSystemActionType && !actionType?.subFeature) {
      return [];
    }
    return actionType?.getKibanaPrivileges?.({ params, source }) ?? [];
  }

  /**
   * Registers an action type to the action type registry
   */
  public register<
    Config extends ActionTypeConfig = ActionTypeConfig,
    Secrets extends ActionTypeSecrets = ActionTypeSecrets,
    Params extends ActionTypeParams = ActionTypeParams,
    ExecutorResultData = void
  >(actionType: ActionType<Config, Secrets, Params, ExecutorResultData>) {
    if (this.has(actionType.id)) {
      throw new Error(
        i18n.translate(
          'xpack.actions.actionTypeRegistry.register.duplicateActionTypeErrorMessage',
          {
            defaultMessage: 'Action type "{id}" is already registered.',
            values: {
              id: actionType.id,
            },
          }
        )
      );
    }

    if (!actionType.supportedFeatureIds || actionType.supportedFeatureIds.length === 0) {
      throw new Error(
        i18n.translate('xpack.actions.actionTypeRegistry.register.missingSupportedFeatureIds', {
          defaultMessage:
            'At least one "supportedFeatureId" value must be supplied for connector type "{connectorTypeId}".',
          values: {
            connectorTypeId: actionType.id,
          },
        })
      );
    }

    if (actionType.supportedFeatureIds.some((id) => id.length > MAX_FEATURE_ID_LENGTH)) {
      throw new Error(
        i18n.translate('xpack.actions.actionTypeRegistry.register.featureIdTooLong', {
          defaultMessage:
            'Feature IDs for connector type "{connectorTypeId}" must not exceed {maxLength} characters.',
          values: {
            connectorTypeId: actionType.id,
            maxLength: MAX_FEATURE_ID_LENGTH,
          },
        })
      );
    }

    if (!areValidFeatures(actionType.supportedFeatureIds)) {
      throw new Error(
        i18n.translate('xpack.actions.actionTypeRegistry.register.invalidConnectorFeatureIds', {
          defaultMessage: 'Invalid feature ids "{ids}" for connector type "{connectorTypeId}".',
          values: {
            connectorTypeId: actionType.id,
            ids: actionType.supportedFeatureIds.join(','),
          },
        })
      );
    }

    if (
      !actionType.isSystemActionType &&
      !actionType.subFeature &&
      actionType.getKibanaPrivileges
    ) {
      throw new Error(
        i18n.translate('xpack.actions.actionTypeRegistry.register.invalidKibanaPrivileges', {
          defaultMessage:
            'Kibana privilege authorization is only supported for system actions and action types that are registered under a sub-feature',
        })
      );
    }

    const maxAttempts = this.actionsConfigUtils.getMaxAttempts({
      actionTypeId: actionType.id,
      actionTypeMaxAttempts: actionType.maxAttempts,
    });

    this.actionTypes.set(actionType.id, { ...actionType } as unknown as ActionType);

    // Skip task type registration for connectors without execute/params
    if (actionType.executor && actionType.validate.params) {
      this.taskManager.registerTaskDefinitions({
        [`actions:${actionType.id}`]: {
          title: actionType.name,
          maxAttempts,
          cost: TaskCost.Tiny,
          taskTypeGroup: TaskTypeGroup.Actions,
          createTaskRunner: (context: RunContext) => this.taskRunnerFactory.create(context),
        },
      });
    }
    // No need to notify usage on basic action types
    if (actionType.minimumLicenseRequired !== 'basic') {
      this.licensing.featureUsage.register(
        getActionTypeFeatureUsageName(actionType as unknown as ActionType),
        actionType.minimumLicenseRequired
      );
    }
  }

  /**
   * Returns an action type, throws if not registered
   */
  public get<
    Config extends ActionTypeConfig = ActionTypeConfig,
    Secrets extends ActionTypeSecrets = ActionTypeSecrets,
    Params extends ActionTypeParams = ActionTypeParams,
    ExecutorResultData = void
  >(id: string): ActionType<Config, Secrets, Params, ExecutorResultData> {
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
    return this.actionTypes.get(id)! as ActionType<Config, Secrets, Params, ExecutorResultData>;
  }

  public tryResolveActionType(id: string, version?: string): ResolvedActionType | undefined {
    const actionType = this.actionTypes.get(id);
    if (actionType) {
      for (const candidate of this.actionTypes.values()) {
        if (candidate.getConnectorSpecsForDiscovery?.().some((spec) => spec.metadata.id === id)) {
          throw new Error(`Connector type "${id}" conflicts with another action type.`);
        }
      }
      const currentSpec = actionType.getConnectorSpec?.();
      const connectorSpec = version
        ? currentSpec?.version === version
          ? currentSpec
          : actionType.getConnectorSpecs?.().find((spec) => spec.version === version)
        : currentSpec;
      if (
        version &&
        (actionType.getConnectorSpec || actionType.getConnectorSpecs) &&
        !connectorSpec
      ) {
        return undefined;
      }
      return {
        registeredActionTypeId: id,
        actionType,
        ...(connectorSpec ? { connectorSpec } : {}),
      };
    }

    const virtualActionTypes = this.getVirtualActionTypes();
    const discoveredActionType = virtualActionTypes.get(id);
    if (
      discoveredActionType &&
      (!version || discoveredActionType.connectorSpec.version === version)
    ) {
      return discoveredActionType;
    }

    let resolved: VirtualActionTypeResolution | undefined;
    for (const [actionTypeId, candidate] of this.actionTypes) {
      const connectorSpec = candidate.getConnectorSpecById?.(id, version);
      if (connectorSpec) {
        if (resolved) {
          throw new Error(`Connector type "${id}" is provided by multiple action types.`);
        }
        resolved = {
          registeredActionTypeId: actionTypeId,
          actionType: candidate,
          connectorSpec,
          specId: id,
        };
      }
    }

    return resolved;
  }

  public resolveActionType(id: string, version?: string): ResolvedActionType {
    const resolved = this.tryResolveActionType(id, version);
    if (resolved) {
      return resolved;
    }

    throw Boom.badRequest(
      i18n.translate('xpack.actions.actionTypeRegistry.get.missingActionTypeErrorMessage', {
        defaultMessage: 'Action type "{id}" is not registered.',
        values: {
          id,
        },
      })
    );
  }

  private getVirtualActionTypes(): Map<string, VirtualActionTypeResolution> {
    const virtualActionTypes = new Map<string, VirtualActionTypeResolution>();
    for (const [registeredActionTypeId, actionType] of this.actionTypes) {
      for (const connectorSpec of actionType.getConnectorSpecsForDiscovery?.() ?? []) {
        const specId = connectorSpec.metadata.id;
        if (this.actionTypes.has(specId) || virtualActionTypes.has(specId)) {
          throw new Error(`Connector type "${specId}" conflicts with another action type.`);
        }
        virtualActionTypes.set(specId, {
          registeredActionTypeId,
          actionType,
          connectorSpec,
          specId,
        });
      }
    }
    return virtualActionTypes;
  }

  /**
   * Returns a list of registered action types [{ id, name, enabled }], filtered by featureId if provided.
   */
  public list(
    { featureId, exposeValidation, exposeSpecActions }: ListOpts = {
      exposeValidation: false,
      exposeSpecActions: false,
    }
  ): CommonActionType[] {
    const includeSpecs = exposeValidation === true || exposeSpecActions === true;
    const virtualActionTypes = this.getVirtualActionTypes();
    const buildCommonActionType = ({
      id,
      registeredId,
      actionType,
      connectorSpec,
      connectorSpecs,
    }: {
      id: string;
      registeredId: string;
      actionType: ActionType;
      connectorSpec?: ConnectorSpec;
      connectorSpecs: ConnectorSpec[];
    }): CommonActionType => {
      const metadata = connectorSpec?.metadata;
      const actionTypeForLicense = metadata
        ? { ...actionType, minimumLicenseRequired: metadata.minimumLicense }
        : actionType;
      const enabledInConfig = this.actionsConfigUtils.isActionTypeEnabled(registeredId);
      const enabledInLicense =
        this.licenseState.isLicenseValidForActionType(actionTypeForLicense).isValid === true;

      return {
        id,
        name: metadata?.displayName ?? actionType.name,
        minimumLicenseRequired: metadata?.minimumLicense ?? actionType.minimumLicenseRequired,
        enabled: enabledInConfig && enabledInLicense,
        enabledInConfig,
        enabledInLicense,
        supportedFeatureIds: metadata?.supportedFeatureIds ?? actionType.supportedFeatureIds,
        isSystemActionType: !!actionType.isSystemActionType,
        source: actionType.source || ACTION_TYPE_SOURCES.stack,
        subFeature: actionType.subFeature,
        ...(exposeValidation === true && registeredId === id && actionType.validate.params
          ? {
              validate: {
                params: actionType.validate.params,
              },
            }
          : {}),
        isDeprecated: !!actionType.isDeprecated,
        allowMultipleSystemActions: actionType.allowMultipleSystemActions,
        description: metadata?.description ?? actionType.description,
        isExperimental: metadata?.isTechnicalPreview ?? actionType.isExperimental,
        isTestable: connectorSpec ? connectorSpec.test.enabled : Boolean(actionType.isTestable),
        ...(includeSpecs && connectorSpec
          ? {
              specActionNames: [
                ...new Set([
                  ...Object.keys(connectorSpec.actions),
                  ...connectorSpecs.flatMap((spec) => Object.keys(spec.actions)),
                ]),
              ],
              specActionSchemas: serializeActionSchemas(connectorSpec),
              ...(connectorSpecs.length > 0
                ? {
                    specActionSchemasByVersion: Object.fromEntries(
                      connectorSpecs.flatMap((spec) =>
                        spec.version ? [[spec.version, serializeActionSchemas(spec)]] : []
                      )
                    ),
                  }
                : {}),
              ...(metadata?.icon ? { icon: metadata.icon } : {}),
            }
          : {}),
      };
    };

    return Array.from(this.actionTypes).flatMap(([actionTypeId, actionType]) => {
      if (actionType.getConnectorSpecsForDiscovery) {
        return [...virtualActionTypes.values()]
          .filter(({ registeredActionTypeId }) => registeredActionTypeId === actionTypeId)
          .filter(({ connectorSpec }) =>
            featureId
              ? connectorSpec.metadata.supportedFeatureIds.some(
                  (supportedFeatureId) => supportedFeatureId === featureId
                )
              : true
          )
          .map((resolved) =>
            buildCommonActionType({
              id: resolved.specId,
              registeredId: resolved.registeredActionTypeId,
              actionType: resolved.actionType,
              connectorSpec: resolved.connectorSpec,
              connectorSpecs: includeSpecs
                ? resolved.actionType.getConnectorSpecsById?.(resolved.specId) ?? []
                : [],
            })
          );
      }

      if (featureId && !actionType.supportedFeatureIds.includes(featureId)) {
        return [];
      }
      const connectorSpec = includeSpecs ? actionType.getConnectorSpec?.() : undefined;
      return [
        buildCommonActionType({
          id: actionTypeId,
          registeredId: actionTypeId,
          actionType,
          connectorSpec,
          connectorSpecs: includeSpecs ? actionType.getConnectorSpecs?.() ?? [] : [],
        }),
      ];
    });
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

  isDeprecated(actionTypeId: string): boolean {
    return Boolean(this.actionTypes.get(actionTypeId)?.isDeprecated);
  }
}
