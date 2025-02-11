/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
  ValidatorServices,
} from '@kbn/actions-plugin/server/types';
import { AlertingConnectorFeatureId, SecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { postXmatters } from './post_xmatters';

export type XmattersConnectorType = ConnectorType<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType,
  unknown
>;
export type XmattersConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType
>;

const configSchemaProps = {
  configUrl: schema.nullable(schema.string()),
  usesBasic: schema.boolean({ defaultValue: true }),
};
const ConfigSchema = schema.object(configSchemaProps);
export type ConnectorTypeConfigType = TypeOf<typeof ConfigSchema>;

// secrets definition
export type ConnectorTypeSecretsType = TypeOf<typeof SecretsSchema>;
const secretSchemaProps = {
  user: schema.nullable(schema.string()),
  password: schema.nullable(schema.string()),
  secretsUrl: schema.nullable(schema.string()),
};
const SecretsSchema = schema.object(secretSchemaProps);

// params definition
export type ActionParamsType = TypeOf<typeof ParamsSchema>;
const ParamsSchema = schema.object({
  alertActionGroupName: schema.maybe(schema.string()),
  signalId: schema.maybe(schema.string()),
  ruleName: schema.maybe(schema.string()),
  date: schema.maybe(schema.string()),
  severity: schema.string(),
  spaceId: schema.maybe(schema.string()),
  tags: schema.maybe(schema.string()),
});

export const ConnectorTypeId = '.xmatters';
// connector type definition
export function getConnectorType(): XmattersConnectorType {
  return {
    id: ConnectorTypeId,
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.stackConnectors.xmatters.title', {
      defaultMessage: 'xMatters',
    }),
    supportedFeatureIds: [AlertingConnectorFeatureId, SecurityConnectorFeatureId],
    validate: {
      config: {
        schema: ConfigSchema,
        customValidator: validateConnectorTypeConfig,
      },
      secrets: {
        schema: SecretsSchema,
        customValidator: validateConnectorTypeSecrets,
      },
      params: {
        schema: ParamsSchema,
      },
      connector: validateConnector,
    },
    executor,
  };
}

function validateConnectorTypeConfig(
  configObject: ConnectorTypeConfigType,
  validatorServices: ValidatorServices
) {
  const { configurationUtilities } = validatorServices;
  const configuredUrl = configObject.configUrl;
  const usesBasic = configObject.usesBasic;
  if (!usesBasic) return;
  try {
    if (configuredUrl) {
      new URL(configuredUrl);
    }
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.xmatters.configurationErrorNoHostname', {
        defaultMessage: 'Error configuring xMatters action: unable to parse url: {err}',
        values: {
          err: err.message,
        },
      })
    );
  }

  try {
    if (configuredUrl) {
      configurationUtilities.ensureUriAllowed(configuredUrl);
    }
  } catch (allowListError) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.xmatters.configurationError', {
        defaultMessage: 'Error configuring xMatters action: {message}',
        values: {
          message: allowListError.message,
        },
      })
    );
  }
}

function validateConnector(
  config: ConnectorTypeConfigType,
  secrets: ConnectorTypeSecretsType
): string | null {
  const { user, password, secretsUrl } = secrets;
  const { usesBasic, configUrl } = config;

  if (usesBasic) {
    if (secretsUrl) {
      return i18n.translate('xpack.stackConnectors.xmatters.shouldNotHaveSecretsUrl', {
        defaultMessage: 'secretsUrl should not be provided when usesBasic is true',
      });
    }
    if (user == null) {
      return i18n.translate('xpack.stackConnectors.xmatters.missingUser', {
        defaultMessage: 'Provide valid Username',
      });
    }
    if (password == null) {
      return i18n.translate('xpack.stackConnectors.xmatters.missingPassword', {
        defaultMessage: 'Provide valid Password',
      });
    }
    if (configUrl == null) {
      return i18n.translate('xpack.stackConnectors.xmatters.missingConfigUrl', {
        defaultMessage: 'Provide valid configUrl',
      });
    }
  } else {
    if (user || password) {
      return i18n.translate('xpack.stackConnectors.xmatters.shouldNotHaveUsernamePassword', {
        defaultMessage: 'Username and password should not be provided when usesBasic is false',
      });
    }
    if (configUrl) {
      return i18n.translate('xpack.stackConnectors.xmatters.shouldNotHaveConfigUrl', {
        defaultMessage: 'configUrl should not be provided when usesBasic is false',
      });
    }
    if (secretsUrl == null) {
      return i18n.translate('xpack.stackConnectors.xmatters.missingSecretsUrl', {
        defaultMessage: 'Provide valid secretsUrl with API Key',
      });
    }
  }
  return null;
}

function validateConnectorTypeSecrets(
  secretsObject: ConnectorTypeSecretsType,
  validatorServices: ValidatorServices
) {
  const { configurationUtilities } = validatorServices;
  if (!secretsObject.secretsUrl && !secretsObject.user && !secretsObject.password) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.xmatters.noSecretsProvided', {
        defaultMessage: 'Provide either secretsUrl link or user/password to authenticate',
      })
    );
  }

  // Check for secrets URL first
  if (secretsObject.secretsUrl) {
    // Neither user/password should be defined if secretsUrl is specified
    if (secretsObject.user || secretsObject.password) {
      throw new Error(
        i18n.translate('xpack.stackConnectors.xmatters.noUserPassWhenSecretsUrl', {
          defaultMessage:
            'Cannot use user/password for URL authentication. Provide valid secretsUrl or use Basic Authentication.',
        })
      );
    }

    // Test that URL is valid
    try {
      if (secretsObject.secretsUrl) {
        new URL(secretsObject.secretsUrl);
      }
    } catch (err) {
      throw new Error(
        i18n.translate('xpack.stackConnectors.xmatters.invalidUrlError', {
          defaultMessage: 'Invalid secretsUrl: {err}',
          values: {
            err: err.toString(),
          },
        })
      );
    }

    // Test that hostname is allowed
    try {
      if (secretsObject.secretsUrl) {
        configurationUtilities.ensureUriAllowed(secretsObject.secretsUrl);
      }
    } catch (allowListError) {
      throw new Error(
        i18n.translate('xpack.stackConnectors.xmatters.hostnameNotAllowed', {
          defaultMessage: '{message}',
          values: {
            message: allowListError.message,
          },
        })
      );
    }
  } else {
    // Username and password must both be set
    if (!secretsObject.user || !secretsObject.password) {
      throw new Error(
        i18n.translate('xpack.stackConnectors.xmatters.invalidUsernamePassword', {
          defaultMessage: 'Both user and password must be specified.',
        })
      );
    }
  }
}

// action executor
export async function executor(
  execOptions: XmattersConnectorTypeExecutorOptions
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const { actionId, configurationUtilities, config, params, logger, connectorUsageCollector } =
    execOptions;
  const { configUrl, usesBasic } = config;
  const data = getPayloadForRequest(params);

  const secrets: ConnectorTypeSecretsType = execOptions.secrets;
  const basicAuth =
    usesBasic && isString(secrets.user) && isString(secrets.password)
      ? { auth: { username: secrets.user, password: secrets.password } }
      : undefined;
  const url = usesBasic ? configUrl : secrets.secretsUrl;

  let result;
  try {
    if (!url) {
      throw new Error('Error: no url provided');
    }
    result = await postXmatters(
      { url, data, basicAuth },
      logger,
      configurationUtilities,
      connectorUsageCollector
    );
  } catch (err) {
    const message = i18n.translate('xpack.stackConnectors.xmatters.postingErrorMessage', {
      defaultMessage: 'Error triggering xMatters workflow',
    });
    logger.warn(`Error thrown triggering xMatters workflow: ${err.message}`);
    return {
      status: 'error',
      actionId,
      message,
      serviceMessage: err.message,
    };
  }

  if (result == null) {
    const message = i18n.translate(
      'xpack.stackConnectors.xmatters.unexpectedNullResponseErrorMessage',
      {
        defaultMessage: 'unexpected null response from xmatters',
      }
    );
    return {
      status: 'error',
      actionId,
      message,
    };
  }

  if (result.status >= 200 && result.status < 300) {
    const { status, statusText } = result;
    logger.debug(`Response from xMatters action "${actionId}": [HTTP ${status}] ${statusText}`);

    return successResult(actionId, data);
  }

  if (result.status === 429 || result.status >= 500) {
    const message = i18n.translate('xpack.stackConnectors.xmatters.postingRetryErrorMessage', {
      defaultMessage: 'Error triggering xMatters flow: http status {status}, retry later',
      values: {
        status: result.status,
      },
    });

    return {
      status: 'error',
      actionId,
      message,
      retry: true,
    };
  }
  const message = i18n.translate('xpack.stackConnectors.xmatters.unexpectedStatusErrorMessage', {
    defaultMessage: 'Error triggering xMatters flow: unexpected status {status}',
    values: {
      status: result.status,
    },
  });

  return {
    status: 'error',
    actionId,
    message,
  };
}

// Action Executor Result w/ internationalisation
function successResult(actionId: string, data: unknown): ConnectorTypeExecutorResult<unknown> {
  return { status: 'ok', data, actionId };
}

interface XmattersPayload {
  alertActionGroupName?: string;
  signalId?: string;
  ruleName?: string;
  date?: string;
  severity: string;
  spaceId?: string;
  tags?: string;
}

function getPayloadForRequest(params: ActionParamsType): XmattersPayload {
  // xMatters will assume the request is a test when the signalId and alertActionGroupName are not defined
  const data: XmattersPayload = {
    alertActionGroupName: params.alertActionGroupName,
    signalId: params.signalId,
    ruleName: params.ruleName,
    date: params.date,
    severity: params.severity || 'High',
    spaceId: params.spaceId,
    tags: params.tags,
  };

  return data;
}
