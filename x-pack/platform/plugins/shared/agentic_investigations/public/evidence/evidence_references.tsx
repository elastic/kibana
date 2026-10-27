/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  EuiButtonIcon,
  EuiCode,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
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

/** Icon for links to well-known places (GitHub, Slack); `link` for any other host. */
export const getLinkIcon = (url: string): string => {
  const hostname = getHostname(url);
  const known =
    hostname &&
    KNOWN_HOST_ICONS.find(({ host }) => hostname === host || hostname.endsWith(`.${host}`))?.icon;
  return known || 'link';
};

const rowStyles = ({ euiTheme }: UseEuiTheme) => css`
  padding: ${euiTheme.size.s};
  border-radius: ${euiTheme.border.radius.medium};
  &:hover {
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
  }
`;

const LinkReference: React.FC<{ reference: EvidenceLinkReference }> = ({
  reference: { url, label },
}) => {
  const theme = useEuiTheme();
  const text = label || url;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${text}. ${EXTERNAL_LINK_LABEL}`}
      data-test-subj="evidenceReferenceLink"
      css={[
        rowStyles(theme),
        css`
          display: block;
          color: inherit;
          text-decoration: none;
        `,
      ]}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={getLinkIcon(url)}
            size="m"
            aria-hidden={true}
            data-test-subj="evidenceReferenceIcon"
          />
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-width: 0;
          `}
        >
          <EuiText
            size="s"
            css={css`
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
          >
            {text}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="external" size="s" color="subdued" aria-hidden={true} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </a>
  );
};

const QueryReference: React.FC<{ reference: EvidenceQueryReference }> = ({
  reference: { query },
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="flexStart"
      responsive={false}
      data-test-subj="evidenceReferenceQuery"
      css={css`
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
        border-radius: ${euiTheme.border.radius.medium};
        padding: ${euiTheme.size.s};
      `}
    >
      <EuiFlexItem
        css={css`
          min-width: 0;
        `}
      >
        <EuiCode
          transparentBackground
          css={css`
            display: block;
            padding: 0;
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
};

export interface EvidenceReferencesProps {
  references: EvidenceReference[];
}

/**
 * The links and queries behind a piece of evidence, in a popover opened from a bordered
 * "N references" row. Links open in a new tab, with an icon for well-known hosts; queries have
 * a copy button.
 */
export const EvidenceReferences: React.FC<EvidenceReferencesProps> = ({ references }) => {
  const { euiTheme } = useEuiTheme();
  const popoverId = useGeneratedHtmlId({ prefix: 'investigationEvidenceReferences' });
  const [isOpen, setIsOpen] = useState(false);
  const [triggerWidth, setTriggerWidth] = useState<number>();
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const togglePopover = useCallback(() => setIsOpen((open) => !open), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  useLayoutEffect(() => {
    const element = triggerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }
    setTriggerWidth(element.offsetWidth);
    const observer = new ResizeObserver(() => setTriggerWidth(element.offsetWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (references.length === 0) {
    return null;
  }
  const label = referencesToggleLabel(references.length);
  return (
    <div ref={triggerRef}>
      <EuiPopover
        id={popoverId}
        isOpen={isOpen}
        closePopover={closePopover}
        anchorPosition="downLeft"
        attachToAnchor
        repositionToCrossAxis={false}
        panelPaddingSize="s"
        display="block"
        aria-label={label}
        panelStyle={triggerWidth ? { width: triggerWidth } : undefined}
        button={
          <EuiPanel
            element="button"
            hasBorder
            hasShadow={false}
            paddingSize="s"
            onClick={togglePopover}
            aria-expanded={isOpen}
            data-test-subj="investigationEvidenceReferences"
            css={css`
              width: 100%;
              text-align: left;
            `}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <span
                  css={css`
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: ${euiTheme.size.xl};
                    height: ${euiTheme.size.xl};
                    border-radius: 50%;
                    background-color: ${euiTheme.colors.backgroundBaseSubdued};
                  `}
                >
                  <EuiIcon type="pin" size="s" color="subdued" aria-hidden={true} />
                </span>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">{label}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type={isOpen ? 'chevronSingleUp' : 'chevronSingleDown'}
                  size="m"
                  color="subdued"
                  aria-hidden={true}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        }
      >
        <EuiFlexGroup direction="column" gutterSize="xs" role="list">
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
      </EuiPopover>
    </div>
  );
};
