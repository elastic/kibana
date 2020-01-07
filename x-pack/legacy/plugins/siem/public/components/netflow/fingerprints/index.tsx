/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { uniq } from 'lodash/fp';
import React from 'react';

import {
  CertificateFingerprint,
  TLS_CLIENT_CERTIFICATE_FINGERPRINT_SHA1_FIELD_NAME,
  TLS_SERVER_CERTIFICATE_FINGERPRINT_SHA1_FIELD_NAME,
} from '../../certificate_fingerprint';
import { JA3_HASH_FIELD_NAME, Ja3Fingerprint } from '../../ja3_fingerprint';

/**
 * Renders rows of draggable badges containing ja3 and certificate fingerprints
 * (i.e. sha1 hashes)
 */
export const Fingerprints = React.memo<{
  contextId: string;
  eventId: string;
  tlsClientCertificateFingerprintSha1?: string[] | null;
  tlsFingerprintsJa3Hash?: string[] | null;
  tlsServerCertificateFingerprintSha1?: string[] | null;
}>(
  ({
    contextId,
    eventId,
    tlsClientCertificateFingerprintSha1,
    tlsFingerprintsJa3Hash,
    tlsServerCertificateFingerprintSha1,
  }) => (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj="fingerprints-group"
      direction="column"
      gutterSize="none"
      justifyContent="center"
    >
      {tlsFingerprintsJa3Hash != null
        ? uniq(tlsFingerprintsJa3Hash).map(ja3 => (
            <EuiFlexItem key={ja3} grow={false}>
              <Ja3Fingerprint
                contextId={contextId}
                eventId={eventId}
                fieldName={JA3_HASH_FIELD_NAME}
                value={ja3}
              />
            </EuiFlexItem>
          ))
        : null}
      {tlsClientCertificateFingerprintSha1 != null
        ? uniq(tlsClientCertificateFingerprintSha1).map(clientCert => (
            <EuiFlexItem key={clientCert} grow={false}>
              <CertificateFingerprint
                certificateType="client"
                contextId={contextId}
                eventId={eventId}
                fieldName={TLS_CLIENT_CERTIFICATE_FINGERPRINT_SHA1_FIELD_NAME}
                value={clientCert}
              />
            </EuiFlexItem>
          ))
        : null}
      {tlsServerCertificateFingerprintSha1 != null
        ? uniq(tlsServerCertificateFingerprintSha1).map(serverCert => (
            <EuiFlexItem key={serverCert} grow={false}>
              <CertificateFingerprint
                certificateType="server"
                contextId={contextId}
                eventId={eventId}
                fieldName={TLS_SERVER_CERTIFICATE_FINGERPRINT_SHA1_FIELD_NAME}
                value={serverCert}
              />
            </EuiFlexItem>
          ))
        : null}
    </EuiFlexGroup>
  )
);

Fingerprints.displayName = 'Fingerprints';
