/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLiveAnnouncer,
  EuiSpacer,
  useEuiFontSize,
} from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { AddAiConnectorButton } from '../../../../common/components/add_ai_connector_button';
import { useIntegrationForm } from '../../forms/integration_form';
import * as i18n from './translations';

const CALLOUT_ID = 'aiConnectorRequiredCallout';

export const AiConnectorRequiredCallout: React.FC = () => {
  const { form } = useIntegrationForm();
  const isVisible = (form.getFields().connectorId?.errors.length ?? 0) > 0;
  const contentFontSize = useEuiFontSize('s');

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    document.getElementById(CALLOUT_ID)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <KbnWarningCallout
        id={CALLOUT_ID}
        size="s"
        title={null}
        data-test-subj="aiConnectorRequiredCallout"
      >
        <EuiLiveAnnouncer>
          {`${i18n.AI_CONNECTOR_REQUIRED_TITLE}. ${i18n.AI_CONNECTOR_REQUIRED_DESCRIPTION}`}
        </EuiLiveAnnouncer>
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
