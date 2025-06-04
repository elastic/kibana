/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiSpacer, EuiSplitPanel, EuiText } from '@elastic/eui';
import React from 'react';

import type { GetBulkAssetsResponse } from '../../../../../../../../../common';
import { useStartServices } from '../../../../../../hooks';

interface Props {
  savedObject: GetBulkAssetsResponse['items'][0];
  idx: number;
}

export function AssetSloType({ savedObject, idx }: Props) {
  const { http } = useStartServices();

  const { id, attributes } = savedObject;
  const { description, title } = attributes ?? {};

  return (
    <EuiSplitPanel.Inner
      grow={false}
      key={idx}
      data-test-subj={`fleetAssetsAccordion.content.slo.${title}`}
    >
      <EuiText size="m">
        <EuiLink href={http.basePath.prepend('/app/slos/management')}>{id}</EuiLink>
      </EuiText>
      {description && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>{description}</p>
          </EuiText>
        </>
      )}
    </EuiSplitPanel.Inner>
  );
}
