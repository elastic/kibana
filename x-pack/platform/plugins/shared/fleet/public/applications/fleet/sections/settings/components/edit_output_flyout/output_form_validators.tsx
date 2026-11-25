/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';

import {
  findOtlpAuthHeaderConflict,
  isValidOtlpAuthCredential,
  isValidOtlpGrpcMetadataKey,
  isValidOtlpHeaderName,
  OTLP_AUTH_CREDENTIAL_MAX_LENGTH,
  OTLP_HEADER_NAME_MAX_LENGTH,
} from '../../../../../../../common/services/otlp_auth';

import { validateSslPathInput, validateSslPathsCombo } from '../ssl_form_validators';
export { validateSslPathInput, validateSslPathsCombo };

// 1 day, as in the API
const MAX_OAUTH2_DURATION_SECONDS = 86400;

const toSecretValidator =
  (validator: (value: string) => string[] | undefined) =>
  (value: string | { id: string } | undefined) => {
    if (typeof value === 'object') {
      return undefined;
    }

    return validator(value ?? '');
  };

const validKafkaTopicToken = /%\{\[[^\]]+\](?::[^}]*)?\}/g;

export function validateKafkaHosts(value: string[]) {
  const res: Array<{ message: string; index?: number }> = [];
  const urlIndexes: { [key: string]: number[] } = {};

  value.forEach((val, idx) => {
    if (!val) {
      res.push({
        message: i18n.translate('xpack.fleet.settings.outputForm.kafkaHostFieldRequiredError', {
          defaultMessage: 'Host is required',
        }),
      });
      return;
    }

    // Split the URL into parts based on ":"
    const urlParts = val.split(':');
    if (urlParts.length !== 2 || !urlParts[0] || !urlParts[1]) {
      res.push({
        message: i18n.translate('xpack.fleet.settings.outputForm.kafkaHostPortError', {
          defaultMessage: 'Invalid format. Expected "host:port" without protocol.',
        }),
        index: idx,
      });
      return;
    }

    // Validate that the port is a valid number
    const port = parseInt(urlParts[1], 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      res.push({
        message: i18n.translate('xpack.fleet.settings.outputForm.kafkaPortError', {
          defaultMessage: 'Invalid port number. Expected a number between 1 and 65535',
        }),
        index: idx,
      });
    }

    const curIndexes = urlIndexes[val] || [];
    urlIndexes[val] = [...curIndexes, idx];
  });

  Object.values(urlIndexes)
    .filter(({ length }) => length > 1)
    .forEach((indexes) => {
      indexes.forEach((index) =>
        res.push({
          message: i18n.translate('xpack.fleet.settings.outputForm.kafkaHostDuplicateError', {
            defaultMessage: 'Duplicate URL',
          }),
          index,
        })
      );
    });

  if (value.length === 0) {
    res.push({
      message: i18n.translate('xpack.fleet.settings.outputForm.kafkaHostRequiredError', {
        defaultMessage: 'Host is required',
      }),
    });
  }

  if (res.length) {
    return res;
  }
}

export function validateESHosts(value: string[]) {
  const res: Array<{ message: string; index?: number }> = [];
  const urlIndexes: { [key: string]: number[] } = {};
  const urlRequiredMessage = i18n.translate(
    'xpack.fleet.settings.outputForm.elasticUrlRequiredError',
    {
      defaultMessage: 'URL is required',
    }
  );
  value.forEach((val, idx) => {
    try {
      if (!val) {
        res.push({
          message: urlRequiredMessage,
          index: idx,
        });
      } else {
        const urlParsed = new URL(val);
        if (!['http:', 'https:'].includes(urlParsed.protocol)) {
          res.push({
            message: i18n.translate('xpack.fleet.settings.outputForm.invalidProtocolError', {
              defaultMessage: 'Invalid protocol',
            }),
            index: idx,
          });
        }
      }
    } catch (error) {
      res.push({
        message: i18n.translate('xpack.fleet.settings.outputForm.elasticHostError', {
          defaultMessage: 'Invalid URL',
        }),
        index: idx,
      });
    }

    const curIndexes = urlIndexes[val] || [];
    urlIndexes[val] = [...curIndexes, idx];
  });

  Object.values(urlIndexes)
    .filter(({ length }) => length > 1)
    .forEach((indexes) => {
      indexes.forEach((index) =>
        res.push({
          message: i18n.translate('xpack.fleet.settings.outputForm.elasticHostDuplicateError', {
            defaultMessage: 'Duplicate URL',
          }),
          index,
        })
      );
    });

  if (value.length === 0) {
    res.push({
      message: urlRequiredMessage,
    });
  }

  if (res.length) {
    return res;
  }
}

export function validateLogstashHosts(value: string[]) {
  const res: Array<{ message: string; index?: number }> = [];
  const urlIndexes: { [key: string]: number[] } = {};
  value.forEach((val, idx) => {
    try {
      if (val.match(/^http([s]){0,1}:\/\//)) {
        res.push({
          message: i18n.translate('xpack.fleet.settings.outputForm.logstashHostProtocolError', {
            defaultMessage: 'Host address must begin with a domain name or IP address',
          }),
          index: idx,
        });
        return;
      }

      const url = new URL(`http://${val}`);

      if (url.host !== val.toLowerCase()) {
        throw new Error('Invalid host');
      }
    } catch (error) {
      if (val.length === 0) {
        res.push({
          message: i18n.translate('xpack.fleet.settings.outputForm.logstashHostRequiredError', {
            defaultMessage: 'Host is required',
          }),
          index: idx,
        });
      } else {
        res.push({
          message: i18n.translate('xpack.fleet.settings.outputForm.logstashHostError', {
            defaultMessage: 'Invalid Host',
          }),
          index: idx,
        });
      }
    }

    const curIndexes = urlIndexes[val] || [];
    urlIndexes[val] = [...curIndexes, idx];
  });

  Object.values(urlIndexes)
    .filter(({ length }) => length > 1)
    .forEach((indexes) => {
      indexes.forEach((index) =>
        res.push({
          message: i18n.translate('xpack.fleet.settings.outputForm.logstashHostDuplicateError', {
            defaultMessage: 'Duplicate Host',
          }),
          index,
        })
      );
    });
  if (value.length === 0) {
    res.push({
      message: i18n.translate('xpack.fleet.settings.outputForm.logstashHostRequiredError', {
        defaultMessage: 'Host is required',
      }),
    });
  }

  if (res.length) {
    return res;
  }
}

export type YamlParseFn = (value: string) => unknown;

export const createValidateYamlConfig = (parse: YamlParseFn) => (value: string) => {
  try {
    parse(value);
    return;
  } catch (error) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.invalidYamlFormatErrorMessage', {
        defaultMessage: 'Invalid YAML: {reason}',
        values: { reason: (error as Error).message },
      }),
    ];
  }
};

export function validateName(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.nameIsRequiredErrorMessage', {
        defaultMessage: 'Name is required',
      }),
    ];
  }
}

export function validateKibanaURL(val: string, syncEnabled: boolean) {
  try {
    if (syncEnabled && !val) {
      return [
        i18n.translate('xpack.fleet.settings.outputForm.urlRequiredError', {
          defaultMessage: 'URL is required',
        }),
      ];
    } else if (!val) {
      return;
    } else {
      const urlParsed = new URL(val);
      if (!['http:', 'https:'].includes(urlParsed.protocol)) {
        return [
          i18n.translate('xpack.fleet.settings.outputForm.invalidProtocolError', {
            defaultMessage: 'Invalid protocol',
          }),
        ];
      }
    }
  } catch (error) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.invalidURLError', {
        defaultMessage: 'Invalid URL',
      }),
    ];
  }
}

export function validateKafkaUsername(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.kafkaUsernameIsRequired', {
        defaultMessage: 'Username is required',
      }),
    ];
  }
}

export function validateKafkaPassword(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.kafkaPasswordIsRequired', {
        defaultMessage: 'Password is required',
      }),
    ];
  }
}

export const validateKafkaPasswordSecret = toSecretValidator(validateKafkaPassword);

export function validateKafkaOAuth2ClientId(value: string) {
  if (!value || value.trim() === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.kafkaOAuth2ClientIdIsRequired', {
        defaultMessage: 'Client ID is required',
      }),
    ];
  }
}

export function validateKafkaOAuth2ClientSecret(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.kafkaOAuth2ClientSecretIsRequired', {
        defaultMessage: 'Client secret is required',
      }),
    ];
  }
}

export const validateKafkaOAuth2ClientSecretSecret = toSecretValidator(
  validateKafkaOAuth2ClientSecret
);

export function validateKafkaOAuth2ClientCertificateKey(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.kafkaOAuth2ClientCertificateKeyIsRequired', {
        defaultMessage: 'Private key is required',
      }),
    ];
  }
}

export const validateKafkaOAuth2ClientCertificateKeySecret = toSecretValidator(
  validateKafkaOAuth2ClientCertificateKey
);

const requiredText = (value: string, message: string) => {
  if (!value || value.trim() === '') {
    return [message];
  }
};

export function validateKafkaKerberosConfigPath(value: string) {
  return requiredText(
    value,
    i18n.translate('xpack.fleet.settings.outputForm.kafkaKerberosConfigPathIsRequired', {
      defaultMessage: 'Kerberos configuration file is required',
    })
  );
}

export function validateKafkaKerberosRealm(value: string) {
  return requiredText(
    value,
    i18n.translate('xpack.fleet.settings.outputForm.kafkaKerberosRealmIsRequired', {
      defaultMessage: 'Realm is required',
    })
  );
}

export function validateKafkaKerberosKeytab(value: string) {
  return requiredText(
    value,
    i18n.translate('xpack.fleet.settings.outputForm.kafkaKerberosKeytabIsRequired', {
      defaultMessage: 'Keytab file is required',
    })
  );
}

export function validateKafkaKerberosUsername(value: string) {
  return requiredText(
    value,
    i18n.translate('xpack.fleet.settings.outputForm.kafkaKerberosUsernameIsRequired', {
      defaultMessage: 'Username is required',
    })
  );
}

export function validateKafkaKerberosPassword(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.kafkaKerberosPasswordIsRequired', {
        defaultMessage: 'Password is required',
      }),
    ];
  }
}

export const validateKafkaKerberosPasswordSecret = toSecretValidator(validateKafkaKerberosPassword);

/** A duration in seconds: optional, and a number that is not negative. */
export function validateKafkaOAuth2Seconds(value: string) {
  if (!value || value.trim() === '') {
    return;
  }

  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > MAX_OAUTH2_DURATION_SECONDS) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.kafkaOAuth2SecondsInvalid', {
        defaultMessage: 'Specify a number of seconds between 0 and {max}',
        values: { max: MAX_OAUTH2_DURATION_SECONDS },
      }),
    ];
  }
}

export function validateKafkaOAuth2Claims(value: string) {
  if (!value || value.trim() === '') {
    return;
  }

  try {
    const claims = JSON.parse(value);
    if (claims === null || typeof claims !== 'object' || Array.isArray(claims)) {
      throw new Error('not an object');
    }
  } catch (error) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.kafkaOAuth2ClaimsInvalid', {
        defaultMessage: 'The claims must be a JSON object, for example {example}',
        values: { example: '{"sub": "my-client"}' },
      }),
    ];
  }
}

export function validateKafkaOAuth2TokenUrl(value: string) {
  if (!value || value.trim() === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.kafkaOAuth2TokenUrlIsRequired', {
        defaultMessage: 'Token URL is required',
      }),
    ];
  }

  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) {
      return [
        i18n.translate('xpack.fleet.settings.outputForm.kafkaOAuth2TokenUrlInvalidProtocol', {
          defaultMessage: 'Token URL must start with http:// or https://',
        }),
      ];
    }
  } catch (error) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.kafkaOAuth2TokenUrlInvalid', {
        defaultMessage: 'Invalid URL',
      }),
    ];
  }
}

export function validateKafkaOAuth2EndpointParams(value: Array<{ key: string; value: string }>) {
  const errors = value.flatMap((row, index) => {
    // the server refuses a request body with a `__proto__` key
    if (row.key === '__proto__') {
      return [
        {
          message: i18n.translate(
            'xpack.fleet.settings.outputForm.kafkaOAuth2EndpointParamsReservedNameError',
            { defaultMessage: '"__proto__" is a reserved name and cannot be used' }
          ),
          index,
          hasKeyError: true,
          hasValueError: false,
        },
      ];
    }
    if ((row.key === '') !== (row.value === '')) {
      return [
        {
          message: i18n.translate(
            'xpack.fleet.settings.outputForm.kafkaOAuth2EndpointParamsError',
            { defaultMessage: 'Specify both the name and the value of the parameter' }
          ),
          index,
          hasKeyError: row.key === '',
          hasValueError: row.value === '',
        },
      ];
    }
    return [];
  });

  return errors.length ? errors : undefined;
}

export function validateCATrustedFingerPrint(value: string) {
  if (value !== '' && !value.match(/^[a-zA-Z0-9]+$/)) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.caTrusterdFingerprintInvalidErrorMessage', {
        defaultMessage:
          'CA trusted fingerprint should be valid HEX encoded SHA-256 of a CA certificate',
      }),
    ];
  }
}

export function validateServiceToken(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.serviceTokenRequiredErrorMessage', {
        defaultMessage: 'Service token is required',
      }),
    ];
  }
}

export const validateServiceTokenSecret = toSecretValidator(validateServiceToken);

export function validateKibanaAPIKey(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.kibanaAPIKeyRequiredErrorMessage', {
        defaultMessage: 'Kibana API Key is required',
      }),
    ];
  }
}

export const validateKibanaAPIKeySecret = toSecretValidator(validateKibanaAPIKey);

export function validateSSLCertificate(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.sslCertificateRequiredErrorMessage', {
        defaultMessage: 'SSL certificate is required',
      }),
    ];
  }
  return validateSslPathInput(value);
}

export function validateSSLKey(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.sslKeyRequiredErrorMessage', {
        defaultMessage: 'SSL key is required',
      }),
    ];
  }
  return validateSslPathInput(value);
}

export const validateSSLKeySecret = toSecretValidator(validateSSLKey);

export function validateKafkaStaticTopic(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.kafkaDefaultTopicRequiredMessage', {
        defaultMessage: 'Default topic is required',
      }),
    ];
  }
}

export function validateDynamicKafkaTopics(value: Array<EuiComboBoxOptionOption<string>>) {
  const res = [];
  value.forEach((val, idx) => {
    if (!val || !val.value) {
      res.push(
        i18n.translate('xpack.fleet.settings.outputForm.kafkaTopicFieldRequiredMessage', {
          defaultMessage: 'Topic is required',
        })
      );
    } else {
      const topic = val.value;
      const stripped = topic.replace(validKafkaTopicToken, '');
      if (stripped.includes('%{') || (!stripped.includes('{[') && stripped.includes(']}'))) {
        res.push(
          i18n.translate('xpack.fleet.settings.outputForm.kafkaTopicBracketsError', {
            defaultMessage:
              'The topic should have a matching number of opening and closing brackets',
          })
        );
      }
      if (/(?<!%)\{\[/.test(stripped)) {
        res.push(
          i18n.translate('xpack.fleet.settings.outputForm.kafkaTopicPercentError', {
            defaultMessage: 'Opening brackets should be preceded by a percent sign',
          })
        );
      }
    }
  });

  if (value.length === 0) {
    res.push(
      i18n.translate('xpack.fleet.settings.outputForm.kafkaTopicRequiredMessage', {
        defaultMessage: 'Topic is required',
      })
    );
  }

  if (res.length) {
    return res;
  }
}

export function validateKafkaClientId(value: string) {
  const regex = /^[A-Za-z0-9._-]+$/;
  return regex.test(value)
    ? undefined
    : [
        i18n.translate('xpack.fleet.settings.outputForm.kafkaClientIdFormattingMessage', {
          defaultMessage:
            'Client ID is invalid. Only letters, numbers, dots, underscores, and dashes are allowed.',
        }),
      ];
}

export function validateKafkaPartitioningGroupEvents(value: string) {
  const regex = /^[0-9]+$/;
  return regex.test(value)
    ? undefined
    : [
        i18n.translate(
          'xpack.fleet.settings.outputForm.kafkaPartitioningGroupEventsFormattingMessage',
          {
            defaultMessage: 'Number of events must be a number',
          }
        ),
      ];
}

export function validateKafkaHeaders(pairs: Array<{ key: string; value: string }>) {
  const errors: Array<{
    message: string;
    index: number;
    hasKeyError: boolean;
    hasValueError: boolean;
  }> = [];

  const existingKeys: Set<string> = new Set();

  pairs.forEach((pair, index) => {
    const { key, value } = pair;

    const hasKey = !!key;
    const hasValue = !!value;

    if (hasKey && !hasValue) {
      errors.push({
        message: i18n.translate('xpack.fleet.settings.outputForm.kafkaHeadersMissingKeyError', {
          defaultMessage: 'Missing value for key "{key}"',
          values: { key },
        }),
        index,
        hasKeyError: false,
        hasValueError: true,
      });
    } else if (!hasKey && hasValue) {
      errors.push({
        message: i18n.translate('xpack.fleet.settings.outputForm.kafkaHeadersMissingValueError', {
          defaultMessage: 'Missing key for value "{value}"',
          values: { value },
        }),
        index,
        hasKeyError: true,
        hasValueError: false,
      });
    } else if (hasKey && hasValue) {
      if (existingKeys.has(key)) {
        errors.push({
          message: i18n.translate('xpack.fleet.settings.outputForm.kafkaHeadersDuplicateKeyError', {
            defaultMessage: 'Duplicate key "{key}"',
            values: { key },
          }),
          index,
          hasKeyError: true,
          hasValueError: false,
        });
      } else {
        existingKeys.add(key);
      }
    }
  });
  if (errors.length) {
    return errors;
  }
}

const GO_DURATION_UNIT = '(?:ns|us|µs|μs|ms|s|m|h)';
const GO_DURATION_REGEX = new RegExp(
  `^(?:0|(?:(?:\\d+(?:\\.\\d*)?|\\.\\d+)${GO_DURATION_UNIT})+)$`
);

export function validateOtlpEndpoint(value: string) {
  const endpoint = value?.trim() ?? '';
  if (!endpoint) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpEndpointIsRequired', {
        defaultMessage: 'Endpoint is required',
      }),
    ];
  }
  if (/\s/.test(endpoint)) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpEndpointInvalid', {
        defaultMessage: 'Endpoint must not contain spaces',
      }),
    ];
  }
  if (endpoint.length > 2048) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpEndpointTooLong', {
        defaultMessage: 'Endpoint must be at most {max} characters',
        values: { max: 2048 },
      }),
    ];
  }
}

/** An optional duration in the Go format used by the collector, such as `5s` or `1m30s`. */
export function validateOtlpDuration(value: string) {
  const duration = value?.trim() ?? '';
  if (!duration) {
    return;
  }
  if (duration.length > 64 || !GO_DURATION_REGEX.test(duration)) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpDurationInvalid', {
        defaultMessage: 'Specify a duration such as {examples}',
        values: { examples: '500ms, 5s, 1m30s' },
      }),
    ];
  }
}

/** An optional number of bytes: a whole number that is not negative. */
export function validateOtlpByteSize(value: string) {
  const size = value?.trim() ?? '';
  if (!size) {
    return;
  }
  if (!/^\d+$/.test(size) || !Number.isSafeInteger(Number(size))) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpByteSizeInvalid', {
        defaultMessage: 'Specify a whole number of bytes, 0 or more',
      }),
    ];
  }
}

/** An optional whole number that is not negative, such as a number of connections. */
export function validateOtlpCount(value: string) {
  const count = value?.trim() ?? '';
  if (!count) {
    return;
  }
  if (!/^\d+$/.test(count) || !Number.isSafeInteger(Number(count))) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpCountInvalid', {
        defaultMessage: 'Specify a whole number, 0 or more',
      }),
    ];
  }
}

const OTLP_COMPRESSION_LEVEL_MIN = -2;
const OTLP_COMPRESSION_LEVEL_MAX = 9;

/** An optional gzip compression level. */
export function validateOtlpCompressionLevel(value: string) {
  const level = value?.trim() ?? '';
  if (!level) {
    return;
  }
  if (
    !/^-?\d+$/.test(level) ||
    Number(level) < OTLP_COMPRESSION_LEVEL_MIN ||
    Number(level) > OTLP_COMPRESSION_LEVEL_MAX
  ) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpCompressionLevelInvalid', {
        defaultMessage: 'Specify a whole number from {min} to {max}',
        values: { min: OTLP_COMPRESSION_LEVEL_MIN, max: OTLP_COMPRESSION_LEVEL_MAX },
      }),
    ];
  }
}

const OTLP_HTTP_URL_SCHEMES = ['http:', 'https:'];
// the proxy schemes that the Go HTTP client supports
const OTLP_PROXY_URL_SCHEMES = ['http:', 'https:', 'socks5:', 'socks5h:'];
const OTLP_HTTP_URL_EXAMPLE = 'https://collector.example.com:4318';
const OTLP_PROXY_URL_EXAMPLE = 'http://proxy.example.com:3128';

/** Validates a URL that is set: at most 2048 characters, with one of the schemes and a host. */
function validateOtlpUrl(url: string, schemes: string[], example: string) {
  if (url.length > 2048) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpUrlTooLong', {
        defaultMessage: 'URL must be at most {max} characters',
        values: { max: 2048 },
      }),
    ];
  }
  let isValid = false;
  if (!/\s/.test(url)) {
    try {
      // a value such as `collector:4318` parses as an opaque URL with the `collector:` scheme
      const { protocol, hostname } = new URL(url);
      isValid = schemes.includes(protocol) && !!hostname;
    } catch (e) {
      isValid = false;
    }
  }
  if (!isValid) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpUrlInvalid', {
        defaultMessage: 'Specify a URL such as {example}',
        values: { example },
      }),
    ];
  }
}

/** The endpoint of an HTTP output: required, and an HTTP or HTTPS URL. */
export function validateOtlpHttpEndpoint(value: string) {
  return (
    validateOtlpEndpoint(value) ??
    validateOtlpUrl(value.trim(), OTLP_HTTP_URL_SCHEMES, OTLP_HTTP_URL_EXAMPLE)
  );
}

/** An optional HTTP or HTTPS URL, such as `https://collector:4318/v1/traces`. */
export function validateOtlpHttpUrl(value: string) {
  const url = value?.trim() ?? '';
  return url ? validateOtlpUrl(url, OTLP_HTTP_URL_SCHEMES, OTLP_HTTP_URL_EXAMPLE) : undefined;
}

/** An optional proxy URL, such as `http://proxy:3128`. */
export function validateOtlpProxyUrl(value: string) {
  const url = value?.trim() ?? '';
  return url ? validateOtlpUrl(url, OTLP_PROXY_URL_SCHEMES, OTLP_PROXY_URL_EXAMPLE) : undefined;
}

/** An optional string of at most 256 characters. */
export function validateOtlpShortString(value: string) {
  if ((value?.trim() ?? '').length > 256) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpShortStringTooLong', {
        defaultMessage: 'Must be at most {max} characters',
        values: { max: 256 },
      }),
    ];
  }
}

/**
 * Validates the headers of the OTLP output. `authHeaderName` is the header that the authentication
 * sets, which the headers cannot set too.
 */
export function validateOtlpHeaders(
  pairs: Array<{ key: string; value: string }>,
  authHeaderName?: string
) {
  const errors = [...(validateKafkaHeaders(pairs) ?? [])];

  if (authHeaderName) {
    const conflict = findOtlpAuthHeaderConflict(
      pairs.map(({ key }) => key),
      authHeaderName
    );
    const index = conflict === undefined ? -1 : pairs.findIndex(({ key }) => key === conflict);
    if (index >= 0) {
      errors.push({
        message: i18n.translate('xpack.fleet.settings.outputForm.otlpHeaderSetByAuth', {
          defaultMessage: 'The {header} header is set by the authentication',
          values: { header: conflict },
        }),
        index,
        hasKeyError: true,
        hasValueError: false,
      });
    }
  }

  pairs.forEach(({ key, value }, index) => {
    if (key.length > 256 || value.length > 1000) {
      errors.push({
        message: i18n.translate('xpack.fleet.settings.outputForm.otlpHeaderTooLong', {
          defaultMessage:
            'Header names must be at most {maxKey} characters and values at most {maxValue}',
          values: { maxKey: 256, maxValue: 1000 },
        }),
        index,
        hasKeyError: key.length > 256,
        hasValueError: value.length > 1000,
      });
    }
  });

  return errors.length ? errors : undefined;
}

export function validateOtlpAuthHeaderName(value: string) {
  const name = value?.trim() ?? '';
  if (!name) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpAuthHeaderNameRequired', {
        defaultMessage: 'Header name is required',
      }),
    ];
  }
  if (!isValidOtlpHeaderName(name)) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpAuthHeaderNameInvalid', {
        defaultMessage:
          'Header name must be at most {max} characters and only contain letters, digits and {chars}',
        values: { max: OTLP_HEADER_NAME_MAX_LENGTH, chars: "!#$%&'*+-.^_`|~" },
      }),
    ];
  }
}

/** The gRPC exporter sends the custom header as metadata, which allows fewer characters. */
export function validateOtlpAuthGrpcHeaderName(value: string) {
  if (!isValidOtlpGrpcMetadataKey(value.trim())) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpAuthGrpcHeaderNameInvalid', {
        defaultMessage:
          'With gRPC, the header name can only contain letters, digits, "-", "_" and ".", cannot start with "grpc-" or end with "-bin"',
      }),
    ];
  }
}

export function validateOtlpAuthCredential(value: string) {
  // the credential is sent trimmed
  const credential = value?.trim() ?? '';
  if (!credential) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpAuthCredentialRequired', {
        defaultMessage: 'Credential is required',
      }),
    ];
  }
  if (credential.length > OTLP_AUTH_CREDENTIAL_MAX_LENGTH) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpAuthCredentialTooLong', {
        defaultMessage: 'Credential must be at most {max} characters',
        values: { max: OTLP_AUTH_CREDENTIAL_MAX_LENGTH },
      }),
    ];
  }
  if (!isValidOtlpAuthCredential(credential)) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpAuthCredentialInvalid', {
        defaultMessage: 'Credential cannot contain line breaks or other control characters',
      }),
    ];
  }
}

export const validateOtlpAuthCredentialSecret = toSecretValidator(validateOtlpAuthCredential);

// the limits of the OTLP exporter TLS settings in the API
const OTLP_TLS_PEM_MAX_LENGTH = 65536;
const OTLP_TLS_FILE_MAX_LENGTH = 4096;
const OTLP_TLS_CIPHER_SUITES_MAX_SIZE = 100;
export const OTLP_TLS_DEFAULT_MIN_VERSION = '1.2';

/** The TLS versions that the collector accepts (configtls), from the lowest to the highest. */
export const OTLP_TLS_VERSIONS = ['1.0', '1.1', '1.2', '1.3'] as const;

/**
 * The cipher suites that the collector accepts by name (configtls), as listed by the Go version
 * that EDOT is built with (crypto/tls `CipherSuites`, without the TLS 1.3 ones, which cannot be
 * configured).
 *
 * These lists are copied from Go 1.26 (src/crypto/tls/cipher_suites.go). Update them, and the
 * insecure ones below, when EDOT moves to a Go version that adds a cipher suite or moves one to
 * `InsecureCipherSuites`: otherwise the form rejects a name that the collector accepts, or the
 * reverse.
 */
export const OTLP_TLS_CIPHER_SUITES = [
  'TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA',
  'TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA',
  'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA',
  'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA',
  'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
  'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
  'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
  'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
  'TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256',
  'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256',
] as const;

/** The TLS 1.3 cipher suites: the collector accepts their names, but they have no effect. */
const OTLP_TLS13_CIPHER_SUITES = [
  'TLS_AES_128_GCM_SHA256',
  'TLS_AES_256_GCM_SHA384',
  'TLS_CHACHA20_POLY1305_SHA256',
];

/**
 * The insecure cipher suites (crypto/tls `InsecureCipherSuites`), which the collector only accepts
 * with `include_insecure_cipher_suites`.
 */
export const OTLP_TLS_INSECURE_CIPHER_SUITES = [
  'TLS_RSA_WITH_RC4_128_SHA',
  'TLS_RSA_WITH_3DES_EDE_CBC_SHA',
  'TLS_RSA_WITH_AES_128_CBC_SHA',
  'TLS_RSA_WITH_AES_256_CBC_SHA',
  'TLS_RSA_WITH_AES_128_CBC_SHA256',
  'TLS_RSA_WITH_AES_128_GCM_SHA256',
  'TLS_RSA_WITH_AES_256_GCM_SHA384',
  'TLS_ECDHE_ECDSA_WITH_RC4_128_SHA',
  'TLS_ECDHE_RSA_WITH_RC4_128_SHA',
  'TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA',
  'TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256',
  'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256',
] as const;

const KNOWN_OTLP_TLS_CIPHER_SUITES: readonly string[] = [
  ...OTLP_TLS_CIPHER_SUITES,
  ...OTLP_TLS13_CIPHER_SUITES,
  ...OTLP_TLS_INSECURE_CIPHER_SUITES,
];

const otlpTooLongError = (max: number) => [
  i18n.translate('xpack.fleet.settings.outputForm.otlpTlsValueTooLong', {
    defaultMessage: 'Must be at most {max} characters',
    values: { max },
  }),
];

// the collector parses the PEM blocks: a value without one, such as a file path, cannot be loaded
const PEM_BEGIN_REGEX = /-----BEGIN [^-\r\n]+-----/;
const PEM_END_REGEX = /-----END [^-\r\n]+-----/;

/**
 * Whether the value has a PEM block: a BEGIN line followed by an END line. Each delimiter is
 * searched once, so a large value without a matching END line is checked in linear time.
 */
const hasPemBlock = (value: string): boolean => {
  const begin = value.search(PEM_BEGIN_REGEX);
  return begin >= 0 && PEM_END_REGEX.test(value.slice(begin));
};

/** An optional PEM-encoded certificate or key. */
export function validateOtlpTlsPem(value: string) {
  const pem = value?.trim() ?? '';
  if (!pem) {
    return;
  }
  if (pem.length > OTLP_TLS_PEM_MAX_LENGTH) {
    return otlpTooLongError(OTLP_TLS_PEM_MAX_LENGTH);
  }
  if (!hasPemBlock(pem)) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpTlsPemInvalid', {
        defaultMessage:
          'Paste the PEM content, from "-----BEGIN" to "-----END". Use the file setting for a path to a file.',
      }),
    ];
  }
}

export const validateOtlpTlsPemSecret = toSecretValidator(validateOtlpTlsPem);

/**
 * The client key of the OTLP exporter. A saved key that is being replaced needs a new value: the
 * saved key is removed with its own action, not by leaving the replacement empty.
 */
export function validateOtlpTlsKeyPemSecret(
  value: string | { id: string } | undefined,
  hasSavedKey: boolean
) {
  // the key is sent trimmed: a blank replacement would leave the saved key in place
  if (hasSavedKey && typeof value === 'string' && !value.trim()) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpTlsKeyPemReplacementRequired', {
        defaultMessage: 'Enter the new client key, or cancel the change',
      }),
    ];
  }
  return validateOtlpTlsPemSecret(value);
}

/** An optional path to a file on the host of the agent. */
export function validateOtlpTlsFilePath(value: string) {
  if ((value?.trim() ?? '').length > OTLP_TLS_FILE_MAX_LENGTH) {
    return otlpTooLongError(OTLP_TLS_FILE_MAX_LENGTH);
  }
}

/** An optional TLS version: one of the versions that the collector accepts. */
export function validateOtlpTlsVersion(value: string) {
  if (value && !(OTLP_TLS_VERSIONS as readonly string[]).includes(value)) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.otlpTlsVersionInvalid', {
        defaultMessage: '"{version}" is not a TLS version that the collector supports. Select one.',
        values: { version: value },
      }),
    ];
  }
}

/** The cipher suites: names that the collector knows. Each error names the cipher suite. */
export function validateOtlpTlsCipherSuites(value: string[]) {
  const errors: Array<{ message: string; index?: number }> = [];
  if (value.length > OTLP_TLS_CIPHER_SUITES_MAX_SIZE) {
    errors.push({
      message: i18n.translate('xpack.fleet.settings.outputForm.otlpTlsCipherSuitesTooMany', {
        defaultMessage: 'Specify at most {max} cipher suites',
        values: { max: OTLP_TLS_CIPHER_SUITES_MAX_SIZE },
      }),
    });
  }
  value.forEach((suite, index) => {
    if (!KNOWN_OTLP_TLS_CIPHER_SUITES.includes(suite)) {
      errors.push({
        message: i18n.translate('xpack.fleet.settings.outputForm.otlpTlsCipherSuiteUnknown', {
          defaultMessage: '"{suite}" is not a cipher suite that the collector supports',
          // a long value is cut, the message only has to identify it
          values: { suite: suite.length > 64 ? `${suite.slice(0, 64)}…` : suite },
        }),
        index,
      });
    }
  });
  return errors.length ? errors : undefined;
}

/** The values of the OTLP exporter TLS settings that depend on each other. */
export interface OtlpTlsPairedValues {
  caPem: string;
  caFile: string;
  certPem: string;
  certFile: string;
  /** Whether a client key is set as a PEM key: a new value, or a stored secret. */
  hasKeyPem: boolean;
  keyFile: string;
  minVersion: string;
  maxVersion: string;
  cipherSuites: string[];
  includeInsecureCipherSuites: boolean;
}

export type OtlpTlsPairedErrors = Partial<
  Record<
    'caFile' | 'certPem' | 'certFile' | 'keyPem' | 'keyFile' | 'maxVersion' | 'cipherSuites',
    string[]
  >
>;

const pemAndFileError = (setting: string) => [
  i18n.translate('xpack.fleet.settings.outputForm.otlpTlsPemAndFile', {
    defaultMessage: 'Specify the {setting} either as PEM or as a file, not both',
    values: { setting },
  }),
];

const isSet = (value: string) => !!value.trim();

/**
 * Validates the TLS settings that depend on each other, as the collector does (configtls): a
 * certificate authority, a client certificate and a client key are each set either as PEM or as a
 * file, the client certificate and key are set together, the minimum TLS version is not above the
 * maximum, and insecure cipher suites are allowed explicitly. Each error is set on the setting to
 * change.
 */
export function validateOtlpTlsPairedSettings(values: OtlpTlsPairedValues): OtlpTlsPairedErrors {
  const errors: OtlpTlsPairedErrors = {};
  const hasCert = isSet(values.certPem) || isSet(values.certFile);
  const hasKey = values.hasKeyPem || isSet(values.keyFile);

  if (isSet(values.caPem) && isSet(values.caFile)) {
    errors.caFile = pemAndFileError(
      i18n.translate('xpack.fleet.settings.outputForm.otlpTlsCaSetting', {
        defaultMessage: 'certificate authority',
      })
    );
  }
  if (isSet(values.certPem) && isSet(values.certFile)) {
    errors.certFile = pemAndFileError(
      i18n.translate('xpack.fleet.settings.outputForm.otlpTlsCertSetting', {
        defaultMessage: 'client certificate',
      })
    );
  }
  if (values.hasKeyPem && isSet(values.keyFile)) {
    errors.keyFile = pemAndFileError(
      i18n.translate('xpack.fleet.settings.outputForm.otlpTlsKeySetting', {
        defaultMessage: 'client key',
      })
    );
  }
  if (hasCert && !hasKey) {
    errors.keyPem = [
      i18n.translate('xpack.fleet.settings.outputForm.otlpTlsKeyRequired', {
        defaultMessage: 'Specify the client key of the client certificate, as PEM or as a file',
      }),
    ];
  }
  if (hasKey && !hasCert) {
    errors.certPem = [
      i18n.translate('xpack.fleet.settings.outputForm.otlpTlsCertRequired', {
        defaultMessage: 'Specify the client certificate of the client key, as PEM or as a file',
      }),
    ];
  }

  // the versions are compared by their position, and an unknown version has its own error; the
  // collector uses TLS 1.2 as the minimum version when it is not set
  const versionIndex = (version: string) =>
    (OTLP_TLS_VERSIONS as readonly string[]).indexOf(version);
  const minIndex = versionIndex(values.minVersion || OTLP_TLS_DEFAULT_MIN_VERSION);
  const maxIndex = versionIndex(values.maxVersion);
  if (minIndex >= 0 && maxIndex >= 0 && minIndex > maxIndex) {
    errors.maxVersion = [
      i18n.translate('xpack.fleet.settings.outputForm.otlpTlsVersionRange', {
        defaultMessage:
          'The maximum TLS version cannot be lower than the minimum TLS version ({defaultMinVersion} when not set)',
        values: { defaultMinVersion: OTLP_TLS_DEFAULT_MIN_VERSION },
      }),
    ];
  }

  const insecureSuites = values.includeInsecureCipherSuites
    ? []
    : values.cipherSuites.filter((suite) =>
        (OTLP_TLS_INSECURE_CIPHER_SUITES as readonly string[]).includes(suite)
      );
  if (insecureSuites.length) {
    errors.cipherSuites = [
      i18n.translate('xpack.fleet.settings.outputForm.otlpTlsInsecureCipherSuites', {
        defaultMessage:
          'Turn on "Allow insecure cipher suites" to use {count, plural, one {the insecure cipher suite} other {the insecure cipher suites}} {suites}',
        values: { count: insecureSuites.length, suites: insecureSuites.join(', ') },
      }),
    ];
  }
  return errors;
}
