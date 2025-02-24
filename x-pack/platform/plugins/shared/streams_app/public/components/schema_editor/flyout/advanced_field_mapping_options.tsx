/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { getAdvancedParameters } from '@kbn/streams-schema';
import { SchemaField } from '../types';
import { useKibana } from '../../../hooks/use_kibana';

const label = i18n.translate('xpack.streams.advancedFieldMappingOptions.label', {
  defaultMessage: 'Advanced field mapping parameters',
});

export const AdvancedFieldMappingOptions = ({
  field,
  onChange,
  isEditing,
}: {
  field: SchemaField;
  onChange: (field: Partial<SchemaField>) => void;
  isEditing: boolean;
}) => {
  const { core } = useKibana();

  const accordionId = useGeneratedHtmlId({ prefix: 'accordionID' });

  const jsonOptions = useMemo(
    () => (field.additionalParameters ? JSON.stringify(field.additionalParameters, null, 2) : ''),
    [field.additionalParameters]
  );

  return (
    <EuiAccordion id={accordionId} buttonContent={label}>
      <EuiPanel color="subdued">
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.streams.advancedFieldMappingOptions.docs.label"
            defaultMessage="Parameters can be defined with JSON. {link}"
            values={{
              link: (
                <EuiLink
                  data-test-subj="streamsAppAdvancedFieldMappingOptionsViewDocumentationLink"
                  href={core.docLinks.links.elasticsearch.docsBase.concat('mapping-params.html')}
                  target="_blank"
                  external
                >
                  <FormattedMessage
                    id="xpack.streams.indexPattern.randomSampling.learnMore"
                    defaultMessage="View documentation."
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
        <EuiSpacer size="s" />
        {isEditing ? (
          <CodeEditor
            height={120}
            languageId="json"
            value={jsonOptions}
            onChange={(value) => {
              try {
                onChange({
                  additionalParameters:
                    value === '' ? undefined : getAdvancedParameters(field.name, JSON.parse(value)),
                });
              } catch (error: unknown) {
                // do nothing
              }
            }}
          />
        ) : (
          <EuiCodeBlock language="json" isCopyable>
            {jsonOptions ?? ''}
          </EuiCodeBlock>
        )}
      </EuiPanel>
    </EuiAccordion>
  );
};
