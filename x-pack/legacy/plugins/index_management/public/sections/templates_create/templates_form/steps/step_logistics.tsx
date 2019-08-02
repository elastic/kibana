/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
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
  EuiText,
  EuiFieldNumber,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Template } from '../../../../../common/types';
import { templatesDocumentationLink } from '../../../../lib/documentation_links';
import { loadIndexPatterns } from '../../../../services/api';
import { StepProps } from '../types';

export const StepLogistics: React.FunctionComponent<StepProps> = ({
  template,
  updateTemplate,
  errors,
}) => {
  const { name, order, version, indexPatterns } = template;
  const { name: nameError, indexPatterns: indexPatternsError } = errors;

  const [allIndexPatterns, setAllIndexPatterns] = useState<Template['indexPatterns']>([]);

  const getIndexPatterns = async () => {
    const indexPatternObjects = await loadIndexPatterns();
    const titles = indexPatternObjects.map((indexPattern: any) => indexPattern.attributes.title);
    setAllIndexPatterns(titles);
  };

  useEffect(() => {
    getIndexPatterns();
  }, []);

  return (
    <div data-test-subj="stepLogistics">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h3>
              <FormattedMessage
                id="xpack.idxMgmt.templatesForm.stepLogistics.stepTitle"
                defaultMessage="Logistics"
              />
            </h3>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.templatesForm.stepLogistics.logisticsDescription"
                defaultMessage="Define index patterns and other settings that will be applied to the template."
              />
            </p>
          </EuiText>
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
              id="xpack.idxMgmt.templatesForm.stepLogistics.docsButtonLabel"
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
                id="xpack.idxMgmt.templatesForm.stepLogistics.nameTitle"
                defaultMessage="Name"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.idxMgmt.templatesForm.stepLogistics.nameDescription"
            defaultMessage="This name will be used as a unique identifier for this template."
          />
        }
        idAria="stepLogisticsNameDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.idxMgmt.templatesForm.stepLogistics.fieldNameLabel"
              defaultMessage="Name (required)"
            />
          }
          isInvalid={Boolean(nameError)}
          error={nameError}
          fullWidth
        >
          <EuiFieldText
            value={name}
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
                id="xpack.idxMgmt.templatesForm.stepLogistics.indexPatternsTitle"
                defaultMessage="Index patterns"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.idxMgmt.templatesForm.stepLogistics.indexPatternsDescription"
            defaultMessage="Define the index patterns that will be applied to the template."
          />
        }
        idAria="stepLogisticsIndexPatternsDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.idxMgmt.templatesForm.stepLogistics.fieldIndexPatternsLabel"
              defaultMessage="Index patterns (required)"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.idxMgmt.templatesForm.stepLogistics.fieldIndexPatternsHelpText"
              defaultMessage={
                'Index patterns must match at least one index. Spaces and the characters / ? " < > | are not allowed.'
              }
            />
          }
          isInvalid={Boolean(indexPatternsError)}
          error={indexPatternsError}
          fullWidth
        >
          <EuiComboBox
            fullWidth
            options={allIndexPatterns.map(indexPattern => ({
              label: indexPattern,
            }))}
            data-test-subj="indexPatternsComboBox"
            selectedOptions={(indexPatterns || []).map((indexPattern: string) => {
              return {
                label: indexPattern,
                value: indexPattern,
              };
            })}
            onChange={(selectedPattern: EuiComboBoxOptionProps[]) => {
              const newIndexPatterns = selectedPattern.map(({ label }) => label);
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
                id="xpack.idxMgmt.templatesForm.stepLogistics.orderTitle"
                defaultMessage="Order"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.idxMgmt.templatesForm.stepLogistics.orderDescription"
            defaultMessage="The order parameter controls the order of merging if multiple templates match an index."
          />
        }
        idAria="stepLogisticsOrderDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.idxMgmt.templatesForm.stepLogistics.fieldOrderLabel"
              defaultMessage="Order"
            />
          }
          fullWidth
        >
          <EuiFieldNumber
            value={order}
            onChange={e => {
              updateTemplate({ order: e.target.value });
            }}
            data-test-subj="orderInput"
            fullWidth
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>{' '}
      {/* Version */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.idxMgmt.templatesForm.stepLogistics.versionTitle"
                defaultMessage="Version"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.idxMgmt.templatesForm.stepLogistics.versionDescription"
            defaultMessage="A version number can be used to simplify template management by external systems."
          />
        }
        idAria="stepLogisticsVersionDescription"
        fullWidth
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.idxMgmt.templatesForm.stepLogistics.fieldVersionLabel"
              defaultMessage="Version"
            />
          }
          fullWidth
        >
          <EuiFieldNumber
            value={version}
            onChange={e => {
              updateTemplate({ version: e.target.value });
            }}
            fullWidth
            data-test-subj="versionInput"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </div>
  );
};
