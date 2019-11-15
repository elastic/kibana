/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import * as React from 'react';

import { encodeIpv6 } from '../../lib/helpers';
import { getHostDetailsUrl, getIPDetailsUrl } from '../link_to';

interface HostDetailsLinkProps {
  children?: React.ReactNode;
  hostName: string;
}

// Internal Links
export const HostDetailsLink = React.memo<HostDetailsLinkProps>(({ children, hostName }) => (
  <EuiLink href={getHostDetailsUrl(encodeURIComponent(hostName))}>
    {children ? children : hostName}
  </EuiLink>
));

HostDetailsLink.displayName = 'HostDetailsLink';

interface IPDetailsLinkProps {
  children?: React.ReactNode;
  ip: string;
}

export const IPDetailsLink = React.memo<IPDetailsLinkProps>(({ children, ip }) => (
  <EuiLink href={`${getIPDetailsUrl(encodeURIComponent(encodeIpv6(ip)))}`}>
    {children ? children : ip}
  </EuiLink>
));

IPDetailsLink.displayName = 'IPDetailsLink';

interface GoogleLinkProps {
  children?: React.ReactNode;
  link: string;
}

// External Links
export const GoogleLink = React.memo<GoogleLinkProps>(({ children, link }) => (
  <EuiLink href={`https://www.google.com/search?q=${encodeURIComponent(link)}`} target="_blank">
    {children ? children : link}
  </EuiLink>
));

GoogleLink.displayName = 'GoogleLink';

interface PortOrServiceNameLinkProps {
  children?: React.ReactNode;
  portOrServiceName: number | string;
}

export const PortOrServiceNameLink = React.memo<PortOrServiceNameLinkProps>(
  ({ children, portOrServiceName }) => (
    <EuiLink
      data-test-subj="port-or-service-name-link"
      href={`https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=${encodeURIComponent(
        String(portOrServiceName)
      )}`}
      target="_blank"
    >
      {children ? children : portOrServiceName}
    </EuiLink>
  )
);

PortOrServiceNameLink.displayName = 'PortOrServiceNameLink';

interface Ja3FingerprintLinkProps {
  children?: React.ReactNode;
  ja3Fingerprint: string;
}

export const Ja3FingerprintLink = React.memo<Ja3FingerprintLinkProps>(
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

Ja3FingerprintLink.displayName = 'Ja3FingerprintLink';

interface CertificateFingerprintLinkProps {
  children?: React.ReactNode;
  certificateFingerprint: string;
}

export const CertificateFingerprintLink = React.memo<CertificateFingerprintLinkProps>(
  ({ children, certificateFingerprint }) => (
    <EuiLink
      data-test-subj="certificate-fingerprint-link"
      href={`https://sslbl.abuse.ch/ssl-certificates/sha1/${encodeURIComponent(
        certificateFingerprint
      )}`}
      target="_blank"
    >
      {children ? children : certificateFingerprint}
    </EuiLink>
  )
);

CertificateFingerprintLink.displayName = 'CertificateFingerprintLink';

interface ReputationLinkProps {
  children?: React.ReactNode;
  domain: string;
}

export const ReputationLink = React.memo<ReputationLinkProps>(({ children, domain }) => (
  <EuiLink
    href={`https://www.talosintelligence.com/reputation_center/lookup?search=${encodeURIComponent(
      domain
    )}`}
    target="_blank"
  >
    {children ? children : domain}
  </EuiLink>
));

ReputationLink.displayName = 'ReputationLink';

interface VirusTotalLinkProps {
  children?: React.ReactNode;
  link: string;
}

export const VirusTotalLink = React.memo<VirusTotalLinkProps>(({ children, link }) => (
  <EuiLink href={`https://www.virustotal.com/#/search/${encodeURIComponent(link)}`} target="_blank">
    {children ? children : link}
  </EuiLink>
));

VirusTotalLink.displayName = 'VirusTotalLink';

interface WhoIsLinkProps {
  children?: React.ReactNode;
  domain: string;
}

export const WhoIsLink = React.memo<WhoIsLinkProps>(({ children, domain }) => (
  <EuiLink href={`https://www.iana.org/whois?q=${encodeURIComponent(domain)}`} target="_blank">
    {children ? children : domain}
  </EuiLink>
));

WhoIsLink.displayName = 'WhoIsLink';
