/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

import * as React from 'react';
import chrome from 'ui/chrome';

import * as i18n from './translations';

export const IndexPatternsMissingPrompt = React.memo<{ indexPatterns: string }>(
  ({ indexPatterns }) => {
    return (
      <EuiEmptyPrompt
        iconType="gisApp"
        title={<h2>{i18n.ERROR_TITLE}</h2>}
        titleSize="xs"
        body={
          <>
            {indexPatterns.length > 0 ? (
              <p>{`${i18n.ERROR_DESCRIPTION} ${i18n.ERROR_EXISTING_INDICES_DESCRIPTION}`}</p>
            ) : (
              <p>{`${i18n.ERROR_DESCRIPTION}`}</p>
            )}
            <p>{indexPatterns}</p>
          </>
        }
        actions={
          <EuiButton
            href={`${chrome.getBasePath()}/app/kibana#/management/kibana/index_patterns`}
            color="primary"
            target="_blank"
            fill
          >
            {i18n.ERROR_BUTTON}
          </EuiButton>
        }
      />
    );
  }
);
