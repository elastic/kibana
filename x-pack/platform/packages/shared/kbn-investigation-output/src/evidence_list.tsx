/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InvestigationEvidence } from '@kbn/significant-events-schema';
import { buildEvidenceDiscoverParams, type InvestigationDiscoverParams } from './evidence_links';

export interface EvidenceListProps {
  evidence: InvestigationEvidence[];
  /**
   * Turns Discover params into a URL. Supplied by the consumer because it needs the `share`
   * locator — without it the queries still render, they just aren't clickable, so a caller that
   * has no Discover access degrades to a read-only presentation rather than breaking.
   */
  getQueryHref?: (params: InvestigationDiscoverParams) => string | undefined;
}

/**
 * The observations an investigation's claim rests on, each with a link back to the query it came
 * from. Shared by hypotheses and by significant-event update proposals, which cite evidence in
 * the same shape.
 *
 * Links always open in a new tab: an investigation may still be streaming into the surrounding
 * view, and navigating away in-tab would drop that live state.
 */
export const EvidenceList: React.FC<EvidenceListProps> = ({ evidence, getQueryHref }) => {
  if (evidence.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="investigationEvidenceList">
      {evidence.map((item, index) => {
        const { description, esql_query: esqlQuery } = item;
        const discoverParams = buildEvidenceDiscoverParams(item);
        const queryHref = discoverParams ? getQueryHref?.(discoverParams) : undefined;

        return (
          <EuiFlexItem key={index} grow={false} data-test-subj="investigationEvidenceItem">
            <EuiText size="xs" color="subdued">
              {description}
            </EuiText>

            {esqlQuery && (
              <>
                <EuiSpacer size="xs" />
                <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
                  {esqlQuery}
                </EuiCodeBlock>
              </>
            )}

            {queryHref && (
              <>
                <EuiSpacer size="xs" />
                <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiBadge
                      color="hollow"
                      iconType="discoverApp"
                      href={queryHref}
                      target="_blank"
                      data-test-subj="investigationEvidenceQueryLink"
                    >
                      {i18n.translate('xpack.investigationOutput.evidence.openInDiscoverLabel', {
                        defaultMessage: 'Open in Discover',
                      })}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
