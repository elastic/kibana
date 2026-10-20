/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiCode,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type {
  EvidenceLinkReference,
  EvidenceQueryReference,
  EvidenceReference,
} from '../../common/evidence';
import { COPY_QUERY_LABEL, EXTERNAL_LINK_LABEL, REFERENCES_LABEL } from './translations';

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

const LinkReference: React.FC<{ reference: EvidenceLinkReference }> = ({
  reference: { url, label },
}) => {
  const icon = getLinkIcon(url);
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      {icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} size="s" aria-hidden={true} data-test-subj="evidenceReferenceIcon" />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
        <EuiText size="xs" css={{ overflowWrap: 'anywhere' }}>
          <EuiLink
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            external
            aria-label={`${label || url}. ${EXTERNAL_LINK_LABEL}`}
            data-test-subj="evidenceReferenceLink"
          >
            {label || url}
          </EuiLink>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const QueryReference: React.FC<{ reference: EvidenceQueryReference }> = ({
  reference: { language, query, label },
}) => (
  <div data-test-subj="evidenceReferenceQuery">
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{language}</EuiBadge>
      </EuiFlexItem>
      {label && (
        <EuiFlexItem>
          <EuiText size="xs">{label}</EuiText>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={Boolean(!label)} />
      <EuiFlexItem grow={false}>
        <EuiCopy textToCopy={query}>
          {(copy) => (
            <EuiToolTip content={COPY_QUERY_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="copyClipboard"
                size="xs"
                color="text"
                aria-label={COPY_QUERY_LABEL}
                onClick={copy}
                data-test-subj="evidenceReferenceCopyQuery"
              />
            </EuiToolTip>
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiCode
      language={language}
      transparentBackground={false}
      css={{ display: 'block', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
    >
      {query}
    </EuiCode>
  </div>
);

export interface EvidenceReferencesProps {
  references: EvidenceReference[];
}

/**
 * The links and queries behind a piece of evidence. Links open in a new tab, with an icon for
 * well-known hosts; queries show their text with a copy-to-clipboard button.
 */
export const EvidenceReferences: React.FC<EvidenceReferencesProps> = ({ references }) => {
  if (references.length === 0) {
    return null;
  }
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      role="list"
      aria-label={REFERENCES_LABEL}
      data-test-subj="investigationEvidenceReferences"
    >
      {references.map((reference, index) => (
        <EuiFlexItem key={index} grow={false} role="listitem">
          {reference.type === 'link' ? (
            <LinkReference reference={reference} />
          ) : (
            <QueryReference reference={reference} />
          )}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
