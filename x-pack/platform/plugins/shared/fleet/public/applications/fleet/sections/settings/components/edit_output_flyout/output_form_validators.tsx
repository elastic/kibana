/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { load } from 'js-yaml';

const toSecretValidator =
  (validator: (value: string) => string[] | undefined) =>
  (value: string | { id: string } | undefined) => {
    if (typeof value === 'object') {
      return undefined;
    }

    return validator(value ?? '');
  };

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

export function validateYamlConfig(value: string) {
  try {
    load(value);
    return;
  } catch (error) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.invalidYamlFormatErrorMessage', {
        defaultMessage: 'Invalid YAML: {reason}',
        values: { reason: error.message },
      }),
    ];
  }
}

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
}

export function validateSSLKey(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.sslKeyRequiredErrorMessage', {
        defaultMessage: 'SSL key is required',
      }),
    ];
  }
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
    if (!val) {
      res.push(
        i18n.translate('xpack.fleet.settings.outputForm.kafkaTopicFieldRequiredMessage', {
          defaultMessage: 'Topic is required',
        })
      );
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
