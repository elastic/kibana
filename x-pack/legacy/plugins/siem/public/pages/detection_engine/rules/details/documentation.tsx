/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiPanel, EuiPageContent, EuiPageContentBody } from '@elastic/eui';
import React, { memo } from 'react';

import * as i18n from './translations';
import { Markdown } from '../../../../components/markdown';

interface DocumentationProps {
  content?: string | null;
}

const DocumentationComponent: React.FC<DocumentationProps> = ({ content }) => {
  if (!content) {
    return (
      <EuiPanel>
        <EuiPageContent>
          <EuiPageContentBody>{i18n.NO_DOCUMENTATION_TEXT}</EuiPageContentBody>
        </EuiPageContent>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel>
      <Markdown raw={content} />
    </EuiPanel>
  );
};

export const Documentation = memo(DocumentationComponent);
