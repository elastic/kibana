/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readFileSync } from 'fs';
import { readPkcs12Truststore, readPkcs12Keystore } from '../../../../../../src/core/utils';

const KEY = 'xpack.monitoring.elasticsearch';

/*
 * Parse a config object's Elasticsearch configuration, reading any
 * certificates/keys from the filesystem
 *
 * TODO: this code can be removed when this plugin is migrated to the Kibana Platform,
 * at that point the ElasticsearchClient and ElasticsearchConfig should be used instead
 */
export const parseElasticsearchConfig = (config: any) => {
  const es = config.get(KEY);

  const errorPrefix = `[config validation of [${KEY}].ssl]`;
  if (es.ssl?.key && es.ssl?.keystore?.path) {
    throw new Error(`${errorPrefix}: cannot use [key] when [keystore.path] is specified`);
  }
  if (es.ssl?.certificate && es.ssl?.keystore?.path) {
    throw new Error(`${errorPrefix}: cannot use [certificate] when [keystore.path] is specified`);
  }

  const { alwaysPresentCertificate, verificationMode } = es.ssl;
  const { key, keyPassphrase, certificate, certificateAuthorities } = readKeyAndCerts(es);

  return {
    ...es,
    ssl: {
      alwaysPresentCertificate,
      key,
      keyPassphrase,
      certificate,
      certificateAuthorities,
      verificationMode,
    },
  };
};

const readKeyAndCerts = (rawConfig: any) => {
  let key: string | undefined;
  let keyPassphrase: string | undefined;
  let certificate: string | undefined;
  let certificateAuthorities: string[] | undefined;

  const addCAs = (ca: string[] | undefined) => {
    if (ca && ca.length) {
      certificateAuthorities = [...(certificateAuthorities || []), ...ca];
    }
  };

  if (rawConfig.ssl.keystore?.path) {
    const keystore = readPkcs12Keystore(
      rawConfig.ssl.keystore.path,
      rawConfig.ssl.keystore.password
    );
    if (!keystore.key) {
      throw new Error(`Did not find key in Elasticsearch keystore.`);
    } else if (!keystore.cert) {
      throw new Error(`Did not find certificate in Elasticsearch keystore.`);
    }
    key = keystore.key;
    certificate = keystore.cert;
    addCAs(keystore.ca);
  } else {
    if (rawConfig.ssl.key) {
      key = readFile(rawConfig.ssl.key);
      keyPassphrase = rawConfig.ssl.keyPassphrase;
    }
    if (rawConfig.ssl.certificate) {
      certificate = readFile(rawConfig.ssl.certificate);
    }
  }

  if (rawConfig.ssl.truststore?.path) {
    const ca = readPkcs12Truststore(
      rawConfig.ssl.truststore.path,
      rawConfig.ssl.truststore.password
    );
    addCAs(ca);
  }

  const ca = rawConfig.ssl.certificateAuthorities;
  if (ca) {
    const parsed: string[] = [];
    const paths = Array.isArray(ca) ? ca : [ca];
    if (paths.length > 0) {
      for (const path of paths) {
        parsed.push(readFile(path));
      }
      addCAs(parsed);
    }
  }

  return {
    key,
    keyPassphrase,
    certificate,
    certificateAuthorities,
  };
};

const readFile = (file: string) => {
  return readFileSync(file, 'utf8');
};
