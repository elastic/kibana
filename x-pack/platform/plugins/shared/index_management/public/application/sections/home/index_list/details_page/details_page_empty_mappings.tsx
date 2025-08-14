/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiButton,
  EuiLink,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { documentationService } from '../../../../services/documentation';

interface EmptyMappingsProps {
  onClick: () => void;
}

export const EmptyMappingsContent: React.FC<EmptyMappingsProps> = ({ onClick }) => {
  return (
    <EuiFlexGroup justifyContent="center" alignItems="center" direction="column">
      <EuiFlexItem grow={false}>
        <EuiEmptyPrompt
          title={
            <h2>
              <FormattedMessage
                id="xpack.idxMgmt.mappings.emptyState.title"
                defaultMessage="Add fields to your data"
              />
            </h2>
          }
          body={
            <EuiText color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.idxMgmt.mappings.emptyState.description"
                  defaultMessage="Mapping is the process of defining how a document, and the fields it contains, are stored and indexed"
                />
              </p>
            </EuiText>
          }
          actions={[
            <EuiButton
              key="addFields"
              iconType="plusInCircle"
              data-test-subj="addFieldButton"
              onClick={onClick}
            >
              <FormattedMessage
                id="xpack.idxMgmt.mappings.emptyState.addFieldsButton"
                defaultMessage="Add fields"
              />
            </EuiButton>,
            <>
              <EuiHorizontalRule />
              <EuiLink
                href={documentationService.getMappingDocumentationLink()}
                target="_blank"
                external
              >
                <FormattedMessage
                  id="xpack.idxMgmt.mappings.emptyState.learnMoreLink"
                  defaultMessage="View Elasticsearch's mapping options"
                />
              </EuiLink>
            </>,
          ]}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
