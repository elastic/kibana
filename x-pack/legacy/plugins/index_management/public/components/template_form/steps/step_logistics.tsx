/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
  EuiSpacer,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiFieldText,
  EuiFieldNumber,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Template } from '../../../../common/types';
import { INVALID_INDEX_PATTERN_CHARS } from '../../../../common/constants';
import { templatesDocumentationLink } from '../../../lib/documentation_links';
import { StepProps } from '../types';

const indexPatternInvalidCharacters = INVALID_INDEX_PATTERN_CHARS.join(' ');

export const StepLogistics: React.FunctionComponent<StepProps> = ({
  template,
  updateTemplate,
  errors,
  isEditing,
}) => {
  const { name, order, version, indexPatterns } = template;
  const { name: nameError, indexPatterns: indexPatternsError } = errors;

  // hooks
  const [allIndexPatterns, setAllIndexPatterns] = useState<Template['indexPatterns']>([]);
  const [touchedFields, setTouchedFields] = useState({
    name: false,
    indexPatterns: false,
  });

  const indexPatternOptions = indexPatterns
    ? indexPatterns.map(pattern => ({ label: pattern, value: pattern }))
    : [];

  const { name: isNameTouched, indexPatterns: isIndexPatternsTouched } = touchedFields;

  return (
    <div data-test-subj="stepLogistics">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h3>
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepLogistics.stepTitle"
                defaultMessage="Logistics"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={templatesDocumentationLink}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.idxMgmt.templateForm.stepLogistics.docsButtonLabel"
              defaultMessage="Index Templates docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      {/* Name */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepLogistics.nameTitle"
                defaultMessage="Name"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.idxMgmt.templateForm.stepLogistics.nameDescription"
            defaultMessage="A unique identifier for this template."
          />
        }
        idAria="stepLogisticsNameDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.idxMgmt.templateForm.stepLogistics.fieldNameLabel"
              defaultMessage="Name"
            />
          }
          isInvalid={isNameTouched && Boolean(nameError)}
          error={nameError}
          fullWidth
        >
          <EuiFieldText
            value={name}
            readOnly={isEditing}
            onBlur={() => setTouchedFields(prevTouched => ({ ...prevTouched, name: true }))}
            data-test-subj="nameInput"
            onChange={e => {
              updateTemplate({ name: e.target.value });
            }}
            fullWidth
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      {/* Index patterns */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepLogistics.indexPatternsTitle"
                defaultMessage="Index patterns"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.idxMgmt.templateForm.stepLogistics.indexPatternsDescription"
            defaultMessage="The index patterns to apply to the template."
          />
        }
        idAria="stepLogisticsIndexPatternsDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.idxMgmt.templateForm.stepLogistics.fieldIndexPatternsLabel"
              defaultMessage="Index patterns"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.idxMgmt.templateForm.stepLogistics.fieldIndexPatternsHelpText"
              defaultMessage="Spaces and the characters {invalidCharactersList} are not allowed."
              values={{
                invalidCharactersList: <strong>{indexPatternInvalidCharacters}</strong>,
              }}
            />
          }
          isInvalid={isIndexPatternsTouched && Boolean(indexPatternsError)}
          error={indexPatternsError}
          fullWidth
        >
          <EuiComboBox
            noSuggestions
            fullWidth
            data-test-subj="indexPatternsComboBox"
            selectedOptions={indexPatternOptions}
            onBlur={() =>
              setTouchedFields(prevTouched => ({ ...prevTouched, indexPatterns: true }))
            }
            onChange={(selectedPattern: EuiComboBoxOptionProps[]) => {
              const newIndexPatterns = selectedPattern.map(({ value }) => value as string);
              updateTemplate({ indexPatterns: newIndexPatterns });
            }}
            onCreateOption={(selectedPattern: string) => {
              if (!selectedPattern.trim().length) {
                return;
              }

              const newIndexPatterns = [...indexPatterns, selectedPattern];

              setAllIndexPatterns([...allIndexPatterns, selectedPattern]);
              updateTemplate({ indexPatterns: newIndexPatterns });
            }}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      {/* Order */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepLogistics.orderTitle"
                defaultMessage="Merge order"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.idxMgmt.templateForm.stepLogistics.orderDescription"
            defaultMessage="The merge order when multiple templates match an index."
          />
        }
        idAria="stepLogisticsOrderDescription"
        fullWidth
      >
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.idxMgmt.templateForm.stepLogistics.fieldOrderLabel"
              defaultMessage="Order (optional)"
            />
          }
        >
          <EuiFieldNumber
            fullWidth
            value={order}
            onChange={e => {
              const value = e.target.value;
              updateTemplate({ order: value === '' ? value : Number(value) });
            }}
            data-test-subj="orderInput"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>{' '}
      {/* Version */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepLogistics.versionTitle"
                defaultMessage="Version"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.idxMgmt.templateForm.stepLogistics.versionDescription"
            defaultMessage="A number that identifies the template to external management systems."
          />
        }
        idAria="stepLogisticsVersionDescription"
        fullWidth
      >
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.idxMgmt.templateForm.stepLogistics.fieldVersionLabel"
              defaultMessage="Version (optional)"
            />
          }
        >
          <EuiFieldNumber
            fullWidth
            value={version}
            onChange={e => {
              const value = e.target.value;
              updateTemplate({ version: value === '' ? value : Number(value) });
            }}
            data-test-subj="versionInput"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </div>
  );
};
