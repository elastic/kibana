/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface ImportsEmptyStateProps {
  canWrite: boolean;
  onSetUp: () => void;
}

export const ImportsEmptyState = ({ canWrite, onSetUp }: ImportsEmptyStateProps) => (
  <EuiEmptyPrompt
    iconType="download"
    data-test-subj="importsEmptyState"
    title={
      <h2>
        <FormattedMessage
          id="xpack.alertingV2.imports.emptyState.title"
          defaultMessage="No imports set up yet"
        />
      </h2>
    }
    body={
      <>
        <p>
          <FormattedMessage
            id="xpack.alertingV2.imports.emptyState.body"
            defaultMessage="Bring in alerts from the tools you already use. Connect a vendor through its connector, or send alerts from any system with a custom webhook."
          />
        </p>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.alertingV2.imports.emptyState.sources"
              defaultMessage="More vendors are coming, the picker shows what is planned."
            />
          </p>
        </EuiText>
      </>
    }
    actions={
      canWrite ? (
        <EuiButton fill iconType="plusCircle" onClick={onSetUp} data-test-subj="importsEmptySetUp">
          {i18n.translate('xpack.alertingV2.imports.emptyState.setUp', {
            defaultMessage: 'Set up import',
          })}
        </EuiButton>
      ) : undefined
    }
  />
);
