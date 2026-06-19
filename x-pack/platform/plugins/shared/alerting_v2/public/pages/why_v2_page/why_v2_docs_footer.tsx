/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { getWhyV2DocLinks, type WhyV2DocLink } from '../../content/why_v2_doc_links';

const DocLinkColumn = ({ item }: { item: WhyV2DocLink }) => (
  <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xs">
        <h3>{item.title}</h3>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        <p>{item.description}</p>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiLink
        href={item.href}
        external
        target="_blank"
        data-test-subj={`${item.dataTestSubj}-link`}
      >
        {item.linkLabel}
      </EuiLink>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const WhyV2DocsFooter = () => {
  const docLinks = useService(CoreStart('docLinks'));
  const docLinkItems = useMemo(() => getWhyV2DocLinks(docLinks.links), [docLinks.links]);

  return (
    <section data-test-subj="whyV2DocsFooter">
      <EuiFlexGrid columns={3} gutterSize="l" responsive>
        {docLinkItems.map((item) => (
          <EuiFlexItem key={item.id} data-test-subj={item.dataTestSubj}>
            <DocLinkColumn item={item} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      <EuiSpacer size="xxl" />
    </section>
  );
};
