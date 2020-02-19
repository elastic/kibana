/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React, { useState, useEffect, useMemo } from 'react';

import {
  DefaultFieldRendererOverflow,
  DEFAULT_MORE_MAX_HEIGHT,
} from '../field_renderers/field_renderers';
import { encodeIpv6 } from '../../lib/helpers';
import {
  getCaseDetailsUrl,
  getHostDetailsUrl,
  getIPDetailsUrl,
  getCreateCaseUrl,
} from '../link_to';
import { FlowTarget, FlowTargetSourceDest } from '../../graphql/types';
import { useUiSetting$ } from '../../lib/kibana';
import { IP_REPUTATION_LINKS_SETTING } from '../../../common/constants';
import * as i18n from '../page/network/ip_overview/translations';
import {
  isUrlInvalid,
  isIPv4,
  isIPv6,
} from '../../pages/detection_engine/rules/components/step_about_rule/helpers';

// Internal Links
const HostDetailsLinkComponent: React.FC<{ children?: React.ReactNode; hostName: string }> = ({
  children,
  hostName,
}) => (
  <EuiLink href={getHostDetailsUrl(encodeURIComponent(hostName))}>
    {children ? children : hostName}
  </EuiLink>
);

export const HostDetailsLink = React.memo(HostDetailsLinkComponent);

const IPDetailsLinkComponent: React.FC<{
  children?: React.ReactNode;
  ip: string;
  flowTarget?: FlowTarget | FlowTargetSourceDest;
}> = ({ children, ip, flowTarget = FlowTarget.source }) => (
  <EuiLink href={`${getIPDetailsUrl(encodeURIComponent(encodeIpv6(ip)), flowTarget)}`}>
    {children ? children : ip}
  </EuiLink>
);

export const IPDetailsLink = React.memo(IPDetailsLinkComponent);

const CaseDetailsLinkComponent: React.FC<{ children?: React.ReactNode; detailName: string }> = ({
  children,
  detailName,
}) => (
  <EuiLink href={getCaseDetailsUrl(encodeURIComponent(detailName))}>
    {children ? children : detailName}
  </EuiLink>
);
export const CaseDetailsLink = React.memo(CaseDetailsLinkComponent);
CaseDetailsLink.displayName = 'CaseDetailsLink';

export const CreateCaseLink = React.memo<{ children: React.ReactNode }>(({ children }) => (
  <EuiLink href={getCreateCaseUrl()}>{children}</EuiLink>
));

CreateCaseLink.displayName = 'CreateCaseLink';

// External Links
export const GoogleLink = React.memo<{ children?: React.ReactNode; link: string }>(
  ({ children, link }) => (
    <EuiLink href={`https://www.google.com/search?q=${encodeURIComponent(link)}`} target="_blank">
      {children ? children : link}
    </EuiLink>
  )
);

GoogleLink.displayName = 'GoogleLink';

export const PortOrServiceNameLink = React.memo<{
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

PortOrServiceNameLink.displayName = 'PortOrServiceNameLink';

export const Ja3FingerprintLink = React.memo<{
  children?: React.ReactNode;
  ja3Fingerprint: string;
}>(({ children, ja3Fingerprint }) => (
  <EuiLink
    data-test-subj="ja3-fingerprint-link"
    href={`https://sslbl.abuse.ch/ja3-fingerprints/${encodeURIComponent(ja3Fingerprint)}`}
    target="_blank"
  >
    {children ? children : ja3Fingerprint}
  </EuiLink>
));

Ja3FingerprintLink.displayName = 'Ja3FingerprintLink';

export const CertificateFingerprintLink = React.memo<{
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

CertificateFingerprintLink.displayName = 'CertificateFingerprintLink';

enum DefaultReputationLink {
  'virustotal.com' = 'virustotal.com',
  'talosIntelligence.com' = 'talosIntelligence.com',
}

export interface ReputationLinkSetting {
  name: string;
  url_template: string;
}

function isDefaultReputationLink(name: string): name is DefaultReputationLink {
  return (
    name === DefaultReputationLink['virustotal.com'] ||
    name === DefaultReputationLink['talosIntelligence.com']
  );
}
const isReputationLink = (
  rowItem: string | ReputationLinkSetting
): rowItem is ReputationLinkSetting =>
  (rowItem as ReputationLinkSetting).url_template !== undefined &&
  (rowItem as ReputationLinkSetting).name !== undefined;

export const DEFAULT_NUMBER_OF_REPUTATION_LINK = 5;
const ReputationLinkComponent: React.FC<{
  overflowIndexStart?: number;
  allItemsLimit?: number;
  showDomain?: boolean;
  domain: string;
}> = ({
  overflowIndexStart = DEFAULT_NUMBER_OF_REPUTATION_LINK,
  allItemsLimit = DEFAULT_NUMBER_OF_REPUTATION_LINK,
  showDomain = false,
  domain,
}) => {
  const [ipReputationLinksSetting] = useUiSetting$<ReputationLinkSetting[]>(
    IP_REPUTATION_LINKS_SETTING
  );
  const [ipReputationLinks, setIpReputationLinks] = useState<ReputationLinkSetting[]>(
    ipReputationLinksSetting
  );

  const defaultNameMapping: Record<DefaultReputationLink, string> = useMemo(
    () => ({
      [DefaultReputationLink['virustotal.com']]: i18n.VIEW_VIRUS_TOTAL,
      [DefaultReputationLink['talosIntelligence.com']]: i18n.VIEW_TALOS_INTELLIGENCE,
    }),
    []
  );

  useEffect(() => {
    setIpReputationLinks(
      ipReputationLinks
        ?.slice(0, allItemsLimit)
        .filter(({ url_template }) => !isUrlInvalid(url_template))
        .map(({ name, url_template }: { name: string; url_template: string }) => {
          return {
            name: isDefaultReputationLink(name) ? defaultNameMapping[name] : name,
            url_template: url_template.replace(`{{ip}}`, encodeURIComponent(domain)),
          };
        })
    );
  }, [domain, overflowIndexStart, setIpReputationLinks, defaultNameMapping]);

  return (
    <>
      {ipReputationLinks
        ?.slice(0, overflowIndexStart)
        .map(({ name, url_template: urlTemplate }: ReputationLinkSetting, id) => (
          <EuiLink href={urlTemplate} target="_blank" key={`reputationLink-${id}`}>
            {showDomain ? domain : name ?? domain}
            {id !== Math.max(0, Math.min(overflowIndexStart, ipReputationLinks.length) - 1) && ', '}
          </EuiLink>
        ))}
      <DefaultFieldRendererOverflow
        rowItems={ipReputationLinks}
        idPrefix="moreReputationLink"
        render={rowItem => {
          return (
            isReputationLink(rowItem) && (
              <EuiLink href={rowItem.url_template} target="_blank">
                {rowItem.name ?? domain}
              </EuiLink>
            )
          );
        }}
        moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
        overflowIndexStart={overflowIndexStart}
      />
    </>
  );
};

export const ReputationLink = React.memo(ReputationLinkComponent);

ReputationLink.displayName = 'ReputationLink';

export const WhoIsLink = React.memo<{ children?: React.ReactNode; domain: string }>(
  ({ children, domain }) => (
    <EuiLink href={`https://www.iana.org/whois?q=${encodeURIComponent(domain)}`} target="_blank">
      {children ? children : domain}
    </EuiLink>
  )
);

WhoIsLink.displayName = 'WhoIsLink';
