/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { curry } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
import nodemailerGetService from 'nodemailer/lib/well-known';
import type SMTPConnection from 'nodemailer/lib/smtp-connection';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
  ValidatorServices,
} from '@kbn/actions-plugin/server/types';
import {
  AlertingConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { withoutMustacheTemplate } from '@kbn/actions-plugin/common';
import {
  renderMustacheObject,
  renderMustacheString,
} from '@kbn/actions-plugin/server/lib/mustache_renderer';
import { ActionExecutionSourceType } from '@kbn/actions-plugin/server/types';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import { AdditionalEmailServices } from '../../../common';
import type { SendEmailOptions, Transport } from './send_email';
import { sendEmail, JSON_TRANSPORT_SERVICE } from './send_email';
import { portSchema } from '../lib/schemas';
import { serviceParamValueToKbnSettingMap as emailKbnSettings } from '../../../common/email/constants';

export type EmailConnectorType = ConnectorType<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType,
  unknown
>;
export type EmailConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType
>;

// config definition
export type ConnectorTypeConfigType = TypeOf<typeof ConfigSchema>;

// these values for `service` require users to fill in host/port/secure
export const CUSTOM_HOST_PORT_SERVICES: string[] = [AdditionalEmailServices.OTHER];

export const ELASTIC_CLOUD_SERVICE: SMTPConnection.Options = {
  host: 'dockerhost',
  port: 10025,
  secure: false,
};

const EMAIL_FOOTER_DIVIDER = '\n\n---\n\n';

const ConfigSchemaProps = {
  service: schema.string({ defaultValue: 'other' }),
  host: schema.nullable(schema.string()),
  port: schema.nullable(portSchema()),
  secure: schema.nullable(schema.boolean()),
  from: schema.string(),
  hasAuth: schema.boolean({ defaultValue: true }),
  tenantId: schema.nullable(schema.string()),
  clientId: schema.nullable(schema.string()),
  oauthTokenUrl: schema.nullable(schema.string()),
};

const ConfigSchema = schema.object(ConfigSchemaProps);

function validateConfig(
  configObject: ConnectorTypeConfigType,
  validatorServices: ValidatorServices
) {
  const config = configObject;
  const { configurationUtilities } = validatorServices;
  const awsSesConfig = configurationUtilities.getAwsSesConfig();
  const enabledServices = configurationUtilities.getEnabledEmailServices();

  const serviceKey = config.service as keyof typeof emailKbnSettings;
  if (
    !enabledServices.includes('*') &&
    config.service in emailKbnSettings &&
    !enabledServices.includes(emailKbnSettings[serviceKey])
  ) {
    throw new Error(
      `[service]: "${
        emailKbnSettings[serviceKey]
      }" is not in the list of enabled email services: ${enabledServices.join(',')}`
    );
  }

  const emails = [config.from];
  const invalidEmailsMessage = configurationUtilities.validateEmailAddresses(emails, {
    isSender: true,
  });
  if (invalidEmailsMessage) {
    throw new Error(`[from]: ${invalidEmailsMessage}`);
  }

  // If service is set as JSON_TRANSPORT_SERVICE or EXCHANGE, host/port are ignored, when the email is sent.
  // Note, not currently making these message translated, as will be
  // emitted alongside messages from @kbn/config-schema, which does not
  // translate messages.
  if (config.service === JSON_TRANSPORT_SERVICE) {
    return;
  } else if (config.service === AdditionalEmailServices.EXCHANGE) {
    if (config.clientId == null && config.tenantId == null) {
      throw new Error('[clientId]/[tenantId] is required');
    }

    if (config.clientId == null) {
      throw new Error('[clientId] is required');
    }

    if (config.tenantId == null) {
      throw new Error('[tenantId] is required');
    }
  } else if (awsSesConfig && config.service === AdditionalEmailServices.AWS_SES) {
    if (awsSesConfig.host !== config.host && awsSesConfig.port !== config.port) {
      throw new Error(
        '[ses.host]/[ses.port] does not match with the configured AWS SES host/port combination'
      );
    }
    if (awsSesConfig.host !== config.host) {
      throw new Error('[ses.host] does not match with the configured AWS SES host');
    }
    if (awsSesConfig.port !== config.port) {
      throw new Error('[ses.port] does not match with the configured AWS SES port');
    }
    if (awsSesConfig.secure !== config.secure) {
      throw new Error(`[ses.secure] must be ${awsSesConfig.secure} for AWS SES`);
    }
  } else if (CUSTOM_HOST_PORT_SERVICES.indexOf(config.service) >= 0) {
    // If configured `service` requires custom host/port/secure settings, validate that they are set
    if (config.host == null && config.port == null) {
      throw new Error('[host]/[port] is required');
    }

    if (config.host == null) {
      throw new Error('[host] is required');
    }

    if (config.port == null) {
      throw new Error('[port] is required');
    }

    if (!configurationUtilities.isHostnameAllowed(config.host)) {
      throw new Error(`[host] value '${config.host}' is not in the allowedHosts configuration`);
    }
  } else {
    // Check configured `service` against nodemailer list of well known services + any custom ones allowed by Kibana
    const host = getServiceNameHost(config.service);
    if (host == null) {
      throw new Error(`[service] value '${config.service}' is not valid`);
    }
    if (!configurationUtilities.isHostnameAllowed(host)) {
      throw new Error(
        `[service] value '${config.service}' resolves to host '${host}' which is not in the allowedHosts configuration`
      );
    }
  }
}

// secrets definition

export type ConnectorTypeSecretsType = TypeOf<typeof SecretsSchema>;

const SecretsSchemaProps = {
  user: schema.nullable(schema.string()),
  password: schema.nullable(schema.string()),
  clientSecret: schema.nullable(schema.string()),
};

const SecretsSchema = schema.object(SecretsSchemaProps);

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

const AttachmentSchemaProps = {
  content: schema.string(),
  contentType: schema.maybe(schema.string()),
  filename: schema.string(),
  encoding: schema.maybe(schema.string()),
};
export const AttachmentSchema = schema.object(AttachmentSchemaProps);
export type Attachment = TypeOf<typeof AttachmentSchema>;

const ParamsSchemaProps = {
  to: schema.arrayOf(schema.string(), { defaultValue: [] }),
  cc: schema.arrayOf(schema.string(), { defaultValue: [] }),
  bcc: schema.arrayOf(schema.string(), { defaultValue: [] }),
  subject: schema.string(),
  message: schema.string(),
  messageHTML: schema.nullable(schema.string()),
  // kibanaFooterLink isn't inteded for users to set, this is here to be able to programatically
  // provide a more contextual URL in the footer (ex: URL to the alert details page)
  kibanaFooterLink: schema.object({
    path: schema.string({ defaultValue: '/' }),
    text: schema.string({
      defaultValue: i18n.translate('xpack.stackConnectors.email.kibanaFooterLinkText', {
        defaultMessage: 'Go to Elastic',
      }),
    }),
  }),
  attachments: schema.maybe(schema.arrayOf(AttachmentSchema)),
};

export const ParamsSchema = schema.object(ParamsSchemaProps);

function validateParams(paramsObject: unknown, validatorServices: ValidatorServices) {
  const { configurationUtilities } = validatorServices;

  // avoids circular reference ...
  const params = paramsObject as ActionParamsType;

  const { to, cc, bcc } = params;
  const addrs = to.length + cc.length + bcc.length;

  if (addrs === 0) {
    throw new Error('no [to], [cc], or [bcc] entries');
  }

  const emails = withoutMustacheTemplate(to.concat(cc).concat(bcc));
  const invalidEmailsMessage = configurationUtilities.validateEmailAddresses(emails, {
    treatMustacheTemplatesAsValid: true,
  });
  if (invalidEmailsMessage) {
    throw new Error(`[to/cc/bcc]: ${invalidEmailsMessage}`);
  }
}

interface GetConnectorTypeParams {
  publicBaseUrl?: string;
}

function validateConnector(
  config: ConnectorTypeConfigType,
  secrets: ConnectorTypeSecretsType
): string | null {
  if (config.service === AdditionalEmailServices.EXCHANGE) {
    if (secrets.clientSecret == null) {
      return '[clientSecret] is required';
    }
  } else if (config.hasAuth && (secrets.password == null || secrets.user == null)) {
    if (secrets.user == null) {
      return '[user] is required';
    }
    if (secrets.password == null) {
      return '[password] is required';
    }
  }
  return null;
}

// connector type definition
export const ConnectorTypeId = '.email';
export function getConnectorType(params: GetConnectorTypeParams): EmailConnectorType {
  const { publicBaseUrl } = params;
  return {
    id: ConnectorTypeId,
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.stackConnectors.email.title', {
      defaultMessage: 'Email',
    }),
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      config: {
        schema: ConfigSchema,
        customValidator: validateConfig,
      },
      secrets: {
        schema: SecretsSchema,
      },
      params: {
        schema: ParamsSchema,
        customValidator: validateParams,
      },
      connector: validateConnector,
    },
    renderParameterTemplates,
    executor: curry(executor)({ publicBaseUrl }),
  };
}

function renderParameterTemplates(
  logger: Logger,
  params: ActionParamsType,
  variables: Record<string, unknown>
): ActionParamsType {
  return {
    // most of the params need no escaping
    ...renderMustacheObject(logger, params, variables),
    // message however, needs to escaped as markdown
    message: renderMustacheString(logger, params.message, variables, 'markdown'),
  };
}

// action executor

async function executor(
  {
    publicBaseUrl,
  }: {
    publicBaseUrl: GetConnectorTypeParams['publicBaseUrl'];
  },
  execOptions: EmailConnectorTypeExecutorOptions
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const {
    actionId,
    config,
    secrets,
    params,
    configurationUtilities,
    services,
    logger,
    connectorUsageCollector,
  } = execOptions;
  const connectorTokenClient = services.connectorTokenClient;
  const awsSesConfig = configurationUtilities.getAwsSesConfig();

  const emails = params.to.concat(params.cc).concat(params.bcc);
  let invalidEmailsMessage = configurationUtilities.validateEmailAddresses(emails);
  if (invalidEmailsMessage) {
    return { status: 'error', actionId, message: `[to/cc/bcc]: ${invalidEmailsMessage}` };
  }

  invalidEmailsMessage = configurationUtilities.validateEmailAddresses([config.from], {
    isSender: true,
  });
  if (invalidEmailsMessage) {
    return { status: 'error', actionId, message: `[from]: ${invalidEmailsMessage}` };
  }

  if (params.messageHTML != null) {
    if (execOptions.source?.type !== ActionExecutionSourceType.NOTIFICATION) {
      return {
        status: 'error',
        actionId,
        message: `HTML email can only be sent via notifications`,
      };
    }
  }

  if (params.attachments != null) {
    if (execOptions.source?.type !== ActionExecutionSourceType.NOTIFICATION) {
      return {
        status: 'error',
        actionId,
        message: `Email attachments can only be sent via notifications`,
      };
    }
  }

  const transport: Transport = {};

  if (secrets.user != null) {
    transport.user = secrets.user;
  }
  if (secrets.password != null) {
    transport.password = secrets.password;
  }
  if (secrets.clientSecret != null) {
    transport.clientSecret = secrets.clientSecret;
  }

  if (config.service === AdditionalEmailServices.EXCHANGE) {
    transport.clientId = config.clientId!;
    transport.tenantId = config.tenantId!;
    transport.service = config.service;
    if (config.oauthTokenUrl !== null) {
      transport.oauthTokenUrl = config.oauthTokenUrl;
    }
  } else if (awsSesConfig && config.service === AdditionalEmailServices.AWS_SES) {
    transport.host = awsSesConfig.host;
    transport.port = awsSesConfig.port;
    transport.secure = awsSesConfig.secure;
  } else if (CUSTOM_HOST_PORT_SERVICES.indexOf(config.service) >= 0) {
    // use configured host/port/secure values
    // already validated service or host/port is not null ...
    transport.host = config.host!;
    transport.port = config.port!;
    transport.secure = getSecureValue(config.secure, config.port);
  } else if (config.service === AdditionalEmailServices.ELASTIC_CLOUD) {
    // use custom elastic cloud settings
    transport.host = ELASTIC_CLOUD_SERVICE.host!;
    transport.port = ELASTIC_CLOUD_SERVICE.port!;
    transport.secure = ELASTIC_CLOUD_SERVICE.secure!;
  } else {
    // use nodemailer's well known service config
    transport.service = config.service;
  }

  let actualMessage = params.message;
  const actualHTMLMessage = params.messageHTML;

  if (configurationUtilities.enableFooterInEmail()) {
    const footerMessage = getFooterMessage({
      publicBaseUrl,
      kibanaFooterLink: params.kibanaFooterLink,
    });
    actualMessage = `${params.message}${EMAIL_FOOTER_DIVIDER}${footerMessage}`;
  }

  const sendEmailOptions: SendEmailOptions = {
    connectorId: actionId,
    transport,
    routing: {
      from: config.from,
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
    },
    content: {
      subject: params.subject,
      message: actualMessage,
      messageHTML: actualHTMLMessage,
    },
    hasAuth: config.hasAuth,
    configurationUtilities,
    attachments: params.attachments,
  };

  let result;

  try {
    result = await sendEmail(
      logger,
      sendEmailOptions,
      connectorTokenClient,
      connectorUsageCollector
    );
  } catch (err) {
    const message = i18n.translate('xpack.stackConnectors.email.errorSendingErrorMessage', {
      defaultMessage: 'error sending email',
    });
    const errorResult: ConnectorTypeExecutorResult<unknown> = {
      status: 'error',
      actionId,
      message,
      serviceMessage: err.message,
    };

    // Mark 4xx and 5xx errors as user errors
    const statusCode = err?.response?.status;
    if (statusCode >= 400 && statusCode < 600) {
      return {
        ...errorResult,
        errorSource: TaskErrorSource.USER,
      };
    }

    return errorResult;
  }

  return { status: 'ok', data: result, actionId };
}

// utilities

function getServiceNameHost(service: string): string | null {
  if (service === AdditionalEmailServices.ELASTIC_CLOUD) {
    return ELASTIC_CLOUD_SERVICE.host!;
  }

  const serviceEntry = nodemailerGetService(service);
  if (serviceEntry === false) return null;

  // in theory this won't happen, but it's JS, so just to be safe ...
  if (serviceEntry == null) return null;

  return serviceEntry.host || null;
}

// Returns the secure value - whether to use TLS or not.
// Respect value if not null | undefined.
// Otherwise, if the port is 465, return true, otherwise return false.
// Based on data here:
// - https://github.com/nodemailer/nodemailer/blob/master/lib/well-known/services.json
function getSecureValue(secure: boolean | null | undefined, port: number | null): boolean {
  if (secure != null) return secure;
  if (port === 465) return true;
  return false;
}

function getFooterMessage({
  publicBaseUrl,
  kibanaFooterLink,
}: {
  publicBaseUrl: GetConnectorTypeParams['publicBaseUrl'];
  kibanaFooterLink: ActionParamsType['kibanaFooterLink'];
}) {
  if (!publicBaseUrl) {
    return i18n.translate('xpack.stackConnectors.email.sentByKibanaMessage', {
      defaultMessage: 'This message was sent by Elastic.',
    });
  }

  return i18n.translate('xpack.stackConnectors.email.customViewInKibanaMessage', {
    defaultMessage: 'This message was sent by Elastic. [{kibanaFooterLinkText}]({link}).',
    values: {
      kibanaFooterLinkText: kibanaFooterLink.text,
      link: `${publicBaseUrl}${kibanaFooterLink.path === '/' ? '' : kibanaFooterLink.path}`,
    },
  });
}
