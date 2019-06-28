/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { ExternalLinkIcon } from '../../../../external_link_icon';
import { getLinksFromSignature } from './suricata_links';

const LinkEuiFlexItem = styled(EuiFlexItem)`
  display: inline;
`;

export const SuricataRefs = pure<{ signatureId: number }>(({ signatureId }) => {
  const links = getLinksFromSignature(signatureId);
  return (
    <EuiFlexGroup gutterSize="none" justifyContent="center" wrap>
      {links.map(link => (
        <LinkEuiFlexItem key={link} grow={false}>
          <EuiLink href={link} color="subdued" target="_blank">
            {link}
          </EuiLink>
          <ExternalLinkIcon />
        </LinkEuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
});
