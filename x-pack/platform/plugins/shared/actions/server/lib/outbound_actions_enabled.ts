/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { OUTBOUND_ENABLED_CONFIG_KEY, connectorTypeIsDual } from '@kbn/connector-specs';
import { i18n } from '@kbn/i18n';
import type { ConnectorSpec } from '@kbn/connector-specs';
import type { ActionType } from '../types';
import { generateConfigSchema } from './single_file_connectors/generate_config_schema';

export const OUTBOUND_ACTIONS_DISABLED_MESSAGE = i18n.translate(
  'xpack.actions.serverSideErrors.outboundActionsDisabled',
  {
    defaultMessage:
      'Outbound actions are turned off for this connector. Turn them on to run or test actions.',
  }
);

/**
 * Rejects `is_outbound_actions_enabled` on types that are not dual.
 */
export const assertOutboundActionsToggleAllowed = ({
  actionTypeId,
  requestedEnabled,
}: {
  actionTypeId: string;
  requestedEnabled: boolean | undefined;
}): void => {
  if (requestedEnabled === undefined) {
    return;
  }
  if (connectorTypeIsDual(actionTypeId)) {
    return;
  }
  throw Boom.badRequest(
    i18n.translate('xpack.actions.serverSideErrors.outboundActionsToggleNotDual', {
      defaultMessage:
        'Outbound actions can only be turned off for connectors that both send and receive.',
    })
  );
};

/**
 * Create: omit = on. Only dual types can be off.
 */
export const resolveCreateOutboundActionsEnabled = ({
  actionTypeId,
  requestedEnabled,
}: {
  actionTypeId: string;
  requestedEnabled: boolean | undefined;
}): boolean => {
  if (!connectorTypeIsDual(actionTypeId)) {
    return true;
  }
  return requestedEnabled !== false;
};

/**
 * Update: omit = keep previous. Only dual types can be off.
 */
export const resolveUpdateOutboundActionsEnabled = ({
  actionTypeId,
  requestedEnabled,
  previouslyEnabled,
}: {
  actionTypeId: string;
  requestedEnabled: boolean | undefined;
  previouslyEnabled: boolean;
}): boolean => {
  if (!connectorTypeIsDual(actionTypeId)) {
    return true;
  }
  return requestedEnabled === undefined ? previouslyEnabled : requestedEnabled;
};

/**
 * A dual connector needs at least one direction on.
 */
export const assertInboundOrOutboundEnabled = ({
  actionTypeId,
  isInboundEventsEnabled,
  isOutboundActionsEnabled,
}: {
  actionTypeId: string;
  isInboundEventsEnabled: boolean;
  isOutboundActionsEnabled: boolean;
}): void => {
  if (!connectorTypeIsDual(actionTypeId)) {
    return;
  }
  if (isInboundEventsEnabled || isOutboundActionsEnabled) {
    return;
  }
  throw Boom.badRequest(
    i18n.translate('xpack.actions.serverSideErrors.inboundAndOutboundDisabled', {
      defaultMessage:
        'A connector that both sends and receives needs at least one of inbound events or outbound actions turned on.',
    })
  );
};

/** The saved outbound state of a connector, or `undefined` when the type is not dual. */
export const readOutboundActionsEnabled = ({
  actionTypeId,
  config,
}: {
  actionTypeId: string;
  config?: Record<string, unknown>;
}): boolean | undefined => {
  if (!connectorTypeIsDual(actionTypeId)) {
    return undefined;
  }
  return config?.[OUTBOUND_ENABLED_CONFIG_KEY] !== false;
};

/**
 * Removes any client value of the reserved key, then writes `false` when outbound is off.
 * On leaves no key, so existing connectors stay unchanged.
 */
export const applyOutboundEnabledToConfig = (
  config: Record<string, unknown>,
  isOutboundActionsEnabled: boolean
): Record<string, unknown> => {
  const { [OUTBOUND_ENABLED_CONFIG_KEY]: _omit, ...rest } = config;
  return isOutboundActionsEnabled ? rest : { ...rest, [OUTBOUND_ENABLED_CONFIG_KEY]: false };
};

export const attachOutboundActionsEnabled = <
  T extends {
    id: string;
    actionTypeId: string;
    isPreconfigured?: boolean;
    config?: Record<string, unknown>;
  }
>({
  connectors,
  inMemoryConnectorIdsWithOutboundDisabled,
}: {
  connectors: T[];
  inMemoryConnectorIdsWithOutboundDisabled: ReadonlySet<string>;
}): T[] =>
  connectors.map((connector) => {
    if (!connectorTypeIsDual(connector.actionTypeId)) {
      return connector;
    }
    // A shared id must not copy the state of an in-memory connector onto a saved row, or the reverse.
    const isInMemory = connector.isPreconfigured === true;
    const isEnabled = isInMemory
      ? !inMemoryConnectorIdsWithOutboundDisabled.has(connector.id)
      : connector.config?.[OUTBOUND_ENABLED_CONFIG_KEY] !== false;
    return { ...connector, isOutboundActionsEnabled: isEnabled };
  });

/** True when the request sent no secrets at all. An empty object counts as omitted. */
export const areSecretsOmitted = (secrets: Record<string, unknown> | undefined): boolean =>
  secrets === undefined || Object.keys(secrets).length === 0;

/**
 * The same action type with a config validator where every spec field is optional.
 * Used when outbound is off. Sent fields keep their validation.
 */
export const getOutboundDisabledValidationType = ({
  actionType,
  spec,
}: {
  actionType: ActionType;
  spec: ConnectorSpec | undefined;
}): ActionType => {
  if (spec === undefined) {
    return actionType;
  }
  return {
    ...actionType,
    validate: {
      ...actionType.validate,
      config: generateConfigSchema(spec.schema, Object.keys(spec.actions ?? {}), {
        allFieldsOptional: true,
      }),
    },
  };
};

/**
 * Checks the reserved key of a preconfigured connector (`kibana.yml`).
 * Types that are not dual ignore the key (see `hasIgnoredOutboundKey`), so they are valid here.
 * A `kibana.yml` connector cannot turn inbound events on, so outbound off always leaves both directions off.
 * Returns an error text, or `undefined` when the connector is valid.
 */
export const getPreconfiguredOutboundConfigError = ({
  actionTypeId,
  config,
  isInboundEventsEnabled,
}: {
  actionTypeId: string;
  config: Record<string, unknown>;
  isInboundEventsEnabled: boolean;
}): string | undefined => {
  const value = config[OUTBOUND_ENABLED_CONFIG_KEY];
  if (value === undefined) {
    return undefined;
  }
  if (!connectorTypeIsDual(actionTypeId)) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    return `config.${OUTBOUND_ENABLED_CONFIG_KEY} must be a boolean.`;
  }
  if (value === false && !isInboundEventsEnabled) {
    return `config.${OUTBOUND_ENABLED_CONFIG_KEY} is false, which leaves both inbound events and outbound actions turned off.`;
  }
  return undefined;
};

/** True when a connector that is not dual sets the reserved key. The key has no effect there. */
export const hasIgnoredOutboundKey = ({
  actionTypeId,
  config,
}: {
  actionTypeId: string;
  config: Record<string, unknown> | undefined;
}): boolean =>
  !connectorTypeIsDual(actionTypeId) && config?.[OUTBOUND_ENABLED_CONFIG_KEY] !== undefined;

/** True when a connector of this type has outbound actions turned off in its raw config. */
export const isOutboundActionsDisabledInConfig = ({
  actionTypeId,
  config,
}: {
  actionTypeId: string;
  config: Record<string, unknown> | undefined;
}): boolean => connectorTypeIsDual(actionTypeId) && config?.[OUTBOUND_ENABLED_CONFIG_KEY] === false;
