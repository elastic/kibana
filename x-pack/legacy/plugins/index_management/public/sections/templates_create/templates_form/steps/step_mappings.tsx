/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';
import { mappingDocumentationLink } from '../../../../lib/documentation_links';
import { StepProps } from '../types';

export const StepMappings: React.FunctionComponent<StepProps> = ({ children, errors }) => {
  const { mappings: mappingsError } = errors;

  return (
    <div data-test-subj="stepMappings">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h3 data-test-subj="stepTitle">
              <FormattedMessage
                id="xpack.idxMgmt.templatesForm.stepMappings.stepTitle"
                defaultMessage="Mappings (optional)"
              />
            </h3>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.templatesForm.stepMappings.mappingsDescription"
                defaultMessage="Define how documents and their fields are stored and indexed."
              />
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={mappingDocumentationLink}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.idxMgmt.templatesForm.stepMappings.docsButtonLabel"
              defaultMessage="Mapping docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {/* Mappings plugin */}
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.idxMgmt.templatesForm.stepMappings.fieldMappingsLabel"
            defaultMessage="Mappings"
          />
        }
        isInvalid={Boolean(mappingsError)}
        error={mappingsError}
        fullWidth
      >
        <Fragment>{children}</Fragment>
      </EuiFormRow>
    </div>
  );
};
