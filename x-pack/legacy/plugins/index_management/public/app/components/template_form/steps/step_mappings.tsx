/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { documentationService } from '../../../services/documentation';
import { StepProps } from '../types';
import { MappingsEditor, OnUpdateHandler, LoadMappingsFromJsonButton } from '../../mappings_editor';

export const StepMappings: React.FunctionComponent<StepProps> = ({
  template,
  setDataGetter,
  onStepValidityChange,
}) => {
  const [mappings, setMappings] = useState(template.mappings);

  const onMappingsEditorUpdate = useCallback<OnUpdateHandler>(
    ({ isValid, getData, validate }) => {
      onStepValidityChange(isValid);
      setDataGetter(async () => {
        const isMappingsValid = isValid === undefined ? await validate() : isValid;
        const data = getData(isMappingsValid);
        return Promise.resolve({ isValid: isMappingsValid, data: { mappings: data } });
      });
    },
    [setDataGetter, onStepValidityChange]
  );

  const onJsonLoaded = (json: { [key: string]: any }): void => {
    setMappings(json);
  };

  return (
    <div data-test-subj="stepMappings">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2 data-test-subj="stepTitle">
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepMappings.stepTitle"
                defaultMessage="Mappings (optional)"
              />
            </h2>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepMappings.mappingsDescription"
                defaultMessage="Define how to store and index documents."
              />
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={documentationService.getMappingDocumentationLink()}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.idxMgmt.templateForm.stepMappings.docsButtonLabel"
              defaultMessage="Mapping docs"
            />
          </EuiButtonEmpty>
          <br />
          <LoadMappingsFromJsonButton onJson={onJsonLoaded} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {/* Mappings code editor */}
      <MappingsEditor
        defaultValue={mappings}
        onUpdate={onMappingsEditorUpdate}
        indexSettings={template.settings}
      />

      <EuiSpacer size="m" />
    </div>
  );
};
