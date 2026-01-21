/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { Streams, System } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { StreamExistingSystemsTable } from './stream_existing_systems_table';
import type { AIFeatures } from '../../../hooks/use_ai_features';

const getUnderlineOnHoverStyle = (textDecorationValue: 'underline' | 'none') => css`
  &:hover,
  &:focus {
    text-decoration: ${textDecorationValue};
  }
`;

export const StreamSystemsAccordion = ({
  definition,
  systems,
  loading,
  refresh,
  aiFeatures,
}: {
  definition: Streams.all.Definition;
  systems: System[];
  loading: boolean;
  refresh: () => void;
  aiFeatures: AIFeatures | null;
}) => {
  return (
    <EuiAccordion
      initialIsOpen={true}
      id="stream-systems-accordion"
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false} css={getUnderlineOnHoverStyle('underline')}>
            {i18n.translate('xpack.streams.streamSystemsAccordion.buttonLabel', {
              defaultMessage: 'Systems',
            })}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{systems.length}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      buttonProps={{ css: getUnderlineOnHoverStyle('none') }}
    >
      <EuiSpacer size="s" />
      <StreamExistingSystemsTable
        isLoading={loading}
        systems={systems}
        definition={definition}
        refreshSystems={refresh}
        aiFeatures={aiFeatures}
      />
    </EuiAccordion>
  );
};
