/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiFontSize } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { AddAiConnectorButton } from '../../../../common/components/add_ai_connector_button';
import { useAiConnectors } from '../../../../common/hooks/use_ai_connectors';
import * as i18n from './translations';

export const AiConnectorRequiredCallout: React.FC = () => {
  const { data: connectors, isLoading } = useAiConnectors();
  const contentFontSize = useEuiFontSize('s');

  if (isLoading || connectors?.length !== 0) {
    return null;
  }

  return (
    <>
      <KbnWarningCallout size="s" title={null} data-test-subj="aiConnectorRequiredCallout">
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="m"
          responsive={false}
        >
          <EuiFlexItem css={contentFontSize}>
            <strong>{i18n.AI_CONNECTOR_REQUIRED_TITLE}</strong>
            <span>{i18n.AI_CONNECTOR_REQUIRED_DESCRIPTION}</span>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AddAiConnectorButton />
          </EuiFlexItem>
        </EuiFlexGroup>
      </KbnWarningCallout>
      <EuiSpacer size="m" />
    </>
  );
};

AiConnectorRequiredCallout.displayName = 'AiConnectorRequiredCallout';
