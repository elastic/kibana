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
  EvidenceLinkReference,
  EvidenceQueryReference,
  EvidenceReference,
} from '../../common/evidence';
import { isEvidenceLinkReference } from '../../common/evidence';
import { COPY_QUERY_LABEL, EXTERNAL_LINK_LABEL, referencesToggleLabel } from './translations';

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
  const text = label || url;
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      {icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} size="s" aria-hidden={true} data-test-subj="evidenceReferenceIcon" />
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
          data-test-subj="evidenceReferenceLink"
        >
          {text}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const QueryReference: React.FC<{ reference: EvidenceQueryReference }> = ({
  reference: { query },
}) => (
  <EuiFlexGroup
    gutterSize="xs"
    alignItems="flexStart"
    responsive={false}
    data-test-subj="evidenceReferenceQuery"
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
              data-test-subj="evidenceReferenceCopyQuery"
            />
          </EuiToolTip>
        )}
      </EuiCopy>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export interface EvidenceReferencesProps {
  references: EvidenceReference[];
}

/**
 * The links and queries behind a piece of evidence, behind a small collapsed "N references" toggle.
 * Links open in a new tab, with an icon for well-known hosts; queries have a copy button.
 */
export const EvidenceReferences: React.FC<EvidenceReferencesProps> = ({ references }) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationEvidenceReferences' });
  if (references.length === 0) {
    return null;
  }
  return (
    <EuiAccordion
      id={accordionId}
      arrowProps={{ size: 's', color: 'text' }}
      buttonContent={
        <EuiText size="xs" color="subdued">
          {referencesToggleLabel(references.length)}
        </EuiText>
      }
      data-test-subj="investigationEvidenceReferences"
    >
      <EuiText size="xs">
        <EuiFlexGroup
          direction="column"
          gutterSize="m"
          role="list"
          css={css`
            padding: ${euiTheme.size.s} 0 0 ${euiTheme.size.l};
          `}
        >
          {references.map((reference, index) => (
            <EuiFlexItem key={index} grow={false} role="listitem">
              {isEvidenceLinkReference(reference) ? (
                <LinkReference reference={reference} />
              ) : (
                <QueryReference reference={reference} />
              )}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiText>
    </EuiAccordion>
  );
};
