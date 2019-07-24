/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';

import { encodeIpv6 } from '../../lib/helpers';

// Internal Links
export const HostDetailsLink = pure<{ children?: React.ReactNode; hostName: string }>(
  ({ children, hostName }) => (
    <EuiLink href={`#/link-to/hosts/${encodeURIComponent(hostName)}`}>
      {children ? children : hostName}
    </EuiLink>
  )
);

export const IPDetailsLink = pure<{ children?: React.ReactNode; ip: string }>(
  ({ children, ip }) => (
    <EuiLink href={`#/link-to/network/ip/${encodeURIComponent(encodeIpv6(ip))}`}>
      {children ? children : ip}
    </EuiLink>
  )
);

// External Links
export const GoogleLink = pure<{ children?: React.ReactNode; link: string }>(
  ({ children, link }) => (
    <EuiLink href={`https://www.google.com/search?q=${encodeURIComponent(link)}`} target="_blank">
      {children ? children : link}
    </EuiLink>
  )
);

export const PortOrServiceNameLink = pure<{
  children?: React.ReactNode;
  portOrServiceName: number | string;
}>(({ children, portOrServiceName }) => (
  <EuiLink
    data-test-subj="port-or-service-name-link"
    href={`https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=${encodeURIComponent(
      String(portOrServiceName)
    )}`}
    target="_blank"
  >
    {children ? children : portOrServiceName}
  </EuiLink>
));

export const Ja3FingerprintLink = pure<{ children?: React.ReactNode; ja3Fingerprint: string }>(
  ({ children, ja3Fingerprint }) => (
    <EuiLink
      data-test-subj="ja3-fingerprint-link"
      href={`https://sslbl.abuse.ch/ja3-fingerprints/${encodeURIComponent(ja3Fingerprint)}`}
      target="_blank"
    >
      {children ? children : ja3Fingerprint}
    </EuiLink>
  )
);

export const CertificateFingerprintLink = pure<{
  children?: React.ReactNode;
  certificateFingerprint: string;
}>(({ children, certificateFingerprint }) => (
  <EuiLink
    data-test-subj="certificate-fingerprint-link"
    href={`https://sslbl.abuse.ch/ssl-certificates/sha1/${encodeURIComponent(
      certificateFingerprint
    )}`}
    target="_blank"
  >
    {children ? children : certificateFingerprint}
  </EuiLink>
));

export const ReputationLink = pure<{ children?: React.ReactNode; domain: string }>(
  ({ children, domain }) => (
    <EuiLink
      href={`https://www.talosintelligence.com/reputation_center/lookup?search=${encodeURIComponent(
        domain
      )}`}
      target="_blank"
    >
      {children ? children : domain}
    </EuiLink>
  )
);

export const VirusTotalLink = pure<{ children?: React.ReactNode; link: string }>(
  ({ children, link }) => (
    <EuiLink
      href={`https://www.virustotal.com/#/search/${encodeURIComponent(link)}`}
      target="_blank"
    >
      {children ? children : link}
    </EuiLink>
  )
);

export const WhoIsLink = pure<{ children?: React.ReactNode; domain: string }>(
  ({ children, domain }) => (
    <EuiLink href={`https://www.iana.org/whois?q=${encodeURIComponent(domain)}`} target="_blank">
      {children ? children : domain}
    </EuiLink>
  )
);
