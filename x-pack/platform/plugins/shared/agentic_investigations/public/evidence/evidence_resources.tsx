/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiCode,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  EvidenceLinkResource,
  EvidenceQueryResource,
  EvidenceResource,
} from '../../common/evidence';
import { isEvidenceLinkResource } from '../../common/evidence';
import { COPY_QUERY_LABEL, EXTERNAL_LINK_LABEL, resourcesToggleLabel } from './translations';

const KNOWN_HOST_ICONS: ReadonlyArray<{ host: string; icon: string }> = [
  { host: 'github.com', icon: 'logoGithub' },
  { host: 'slack.com', icon: 'logoSlack' },
];

const getHostname = (url: string): string | undefined => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
};

/** Icon for links to well-known places (GitHub, Slack); `undefined` for any other host. */
export const getLinkIcon = (url: string): string | undefined => {
  const hostname = getHostname(url);
  if (!hostname) {
    return undefined;
  }
  return KNOWN_HOST_ICONS.find(({ host }) => hostname === host || hostname.endsWith(`.${host}`))
    ?.icon;
};

const LinkResource: React.FC<{ resource: EvidenceLinkResource }> = ({
  resource: { url, label },
}) => {
  const icon = getLinkIcon(url);
  const text = label || url;
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      {icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} size="s" aria-hidden={true} data-test-subj="evidenceResourceIcon" />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        grow={false}
        css={css`
          min-width: 0;
          overflow-wrap: anywhere;
        `}
      >
        <EuiLink
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          external
          aria-label={`${text}. ${EXTERNAL_LINK_LABEL}`}
          data-test-subj="evidenceResourceLink"
        >
          {text}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const QueryResource: React.FC<{ resource: EvidenceQueryResource }> = ({ resource: { query } }) => (
  <EuiFlexGroup
    gutterSize="xs"
    alignItems="flexStart"
    responsive={false}
    data-test-subj="evidenceResourceQuery"
  >
    <EuiFlexItem
      css={css`
        min-width: 0;
      `}
    >
      <EuiCode
        transparentBackground={false}
        css={css`
          display: block;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        `}
      >
        {query}
      </EuiCode>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiCopy textToCopy={query}>
        {(copy) => (
          <EuiToolTip content={COPY_QUERY_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="copy"
              size="xs"
              color="text"
              aria-label={COPY_QUERY_LABEL}
              onClick={copy}
              data-test-subj="evidenceResourceCopyQuery"
            />
          </EuiToolTip>
        )}
      </EuiCopy>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export interface EvidenceResourcesProps {
  resources: EvidenceResource[];
}

/**
 * The links and queries behind a piece of evidence, behind a small collapsed "N resources" toggle.
 * Links open in a new tab, with an icon for well-known hosts; queries have a copy button.
 */
export const EvidenceResources: React.FC<EvidenceResourcesProps> = ({ resources }) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationEvidenceResources' });
  if (resources.length === 0) {
    return null;
  }
  return (
    <EuiAccordion
      id={accordionId}
      arrowProps={{ size: 's', color: 'text' }}
      buttonContent={
        <EuiText size="xs" color="subdued">
          {resourcesToggleLabel(resources.length)}
        </EuiText>
      }
      data-test-subj="investigationEvidenceResources"
    >
      <EuiText size="xs">
        <EuiFlexGroup
          direction="column"
          gutterSize="xs"
          role="list"
          css={css`
            padding: ${euiTheme.size.xs} 0 0 ${euiTheme.size.l};
          `}
        >
          {resources.map((resource, index) => (
            <EuiFlexItem key={index} grow={false} role="listitem">
              {isEvidenceLinkResource(resource) ? (
                <LinkResource resource={resource} />
              ) : (
                <QueryResource resource={resource} />
              )}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiText>
    </EuiAccordion>
  );
};
