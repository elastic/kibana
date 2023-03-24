/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';

import * as i18n from '../../translations';

interface Props {
  error: string | null;
  loading: boolean;
  version: string | null;
  versionLoading: boolean;
}

const PanelSubtitleComponent: React.FC<Props> = ({ error, loading, version, versionLoading }) => {
  const allDataLoaded = !loading && !versionLoading && error == null && version != null;

  return allDataLoaded ? (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="s">
          <span>{i18n.SELECT_AN_INDEX}</span> <EuiCode>{version}</EuiCode>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
};

export const PanelSubtitle = React.memo(PanelSubtitleComponent);
