/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { omit, isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiIcon,
  EuiCode,
  EuiButton,
  EuiText,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import {
  useForm,
  Form,
  fieldValidators,
  FormSchema,
  FIELD_TYPES,
  UseField,
  TextField,
  SelectField,
  JsonEditorField,
} from '../../../../shared_imports';

import { useAppContext } from '../../../app_context';
import { IndicesSelector } from './fields/indices_selector';
import { documentationService } from '../../../services/documentation';
import { useCreatePolicyContext, DraftPolicy } from '../create_policy_context';

interface Props {
  onNext: () => void;
}

const DISALLOWED_CHARS = ['"', ' ', '\\', '/', ',', '|', '>', '?', '*', '<'];

export const configurationFormSchema: FormSchema = {
  name: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.configurationStep.policyNameField', {
      defaultMessage: 'Policy name',
    }),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate(
            'xpack.idxMgmt.enrichPolicyCreate.configurationStep.policyNameRequiredError',
            {
              defaultMessage: 'A policy name value is required.',
            }
          )
        ),
      },
      {
        validator: fieldValidators.containsCharsField({
          message: i18n.translate(
            'xpack.idxMgmt.enrichPolicyCreate.configurationStep.invalidCharactersInNameError',
            {
              defaultMessage: `Should not contain any of the following characters: {notAllowedChars}`,
              values: {
                notAllowedChars: DISALLOWED_CHARS.join(', '),
              },
            }
          ),
          chars: DISALLOWED_CHARS,
        }),
      },
    ],
  },

  type: {
    type: FIELD_TYPES.SELECT,
    label: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.configurationStep.policyTypeLabel', {
      defaultMessage: 'Policy type',
    }),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate('xpack.idxMgmt.enrichPolicyCreate.configurationStep.typeRequiredError', {
            defaultMessage: 'A policy type value is required.',
          })
        ),
      },
    ],
  },

  sourceIndices: {
    label: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.configurationStep.sourceLabel', {
      defaultMessage: 'Source',
    }),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate('xpack.idxMgmt.enrichPolicyCreate.configurationStep.sourceRequiredError', {
            defaultMessage: 'At least one source is required.',
          })
        ),
      },
    ],
  },

  query: {
    type: FIELD_TYPES.JSON,
    label: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.configurationStep.queryLabel', {
      defaultMessage: 'Query (optional)',
    }),
    serializer: (jsonString: string) => {
      let parsedJSON: any;
      try {
        parsedJSON = JSON.parse(jsonString);
      } catch {
        parsedJSON = {};
      }

      return parsedJSON;
    },
    deserializer: (json: any) =>
      json && typeof json === 'object' ? JSON.stringify(json, null, 2) : '{\n\n}',
    validations: [
      {
        validator: fieldValidators.isJsonField(
          i18n.translate('xpack.idxMgmt.enrichPolicyCreate.configurationStep.queryInvalidError', {
            defaultMessage: 'The query is not valid JSON.',
          }),
          { allowEmptyString: true }
        ),
      },
    ],
  },
};

export const ConfigurationStep = ({ onNext }: Props) => {
  const {
    core: {
      application: { getUrlForApp },
    },
  } = useAppContext();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { draft, updateDraft, updateCompletionState } = useCreatePolicyContext();

  const { form } = useForm({
    defaultValue: draft,
    schema: configurationFormSchema,
    id: 'configurationForm',
  });

  const onSubmit = async () => {
    const { isValid, data } = await form.submit();

    if (!isValid) {
      return;
    }

    // Update form completion state
    updateCompletionState((prevCompletionState) => ({
      ...prevCompletionState,
      configurationStep: true,
    }));

    // Update draft state with the data of the form
    updateDraft((prevDraft: DraftPolicy) => ({
      ...prevDraft,
      ...(isEmpty(data.query) ? omit(data, 'query') : data),
    }));

    // And then navigate to the next step
    onNext();
  };

  return (
    <Form form={form} data-test-subj="configurationForm">
      <UseField
        path="name"
        component={TextField}
        componentProps={{ fullWidth: false }}
        data-test-subj="policyNameField"
      />

      <UseField
        path="type"
        component={SelectField}
        labelAppend={
          <EuiPopover
            button={
              <EuiLink
                data-test-subj="typePopoverIcon"
                onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
              >
                <EuiIcon type="questionInCircle" />
              </EuiLink>
            }
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
          >
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.idxMgmt.enrichPolicyCreate.configurationStep.typeTitlePopOver"
                  defaultMessage="Determines how to match the data to incoming documents."
                />
              </p>
              <ul>
                <li>
                  <FormattedMessage
                    id="xpack.idxMgmt.enrichPolicyCreate.configurationStep.matchTypePopOver"
                    defaultMessage="{type} matches an exact value."
                    values={{ type: <EuiCode transparentBackground>Match</EuiCode> }}
                  />
                </li>
                <li>
                  <FormattedMessage
                    id="xpack.idxMgmt.enrichPolicyCreate.configurationStep.geoMatchTypePopOver"
                    defaultMessage="{type} matches a geographic location."
                    values={{ type: <EuiCode transparentBackground>Geo match</EuiCode> }}
                  />
                </li>
                <li>
                  <FormattedMessage
                    id="xpack.idxMgmt.enrichPolicyCreate.configurationStep.rangeTypePopOver"
                    defaultMessage="{type} matches a number, date, or IP address range."
                    values={{ type: <EuiCode transparentBackground>Range</EuiCode> }}
                  />
                </li>
              </ul>
            </EuiText>
          </EuiPopover>
        }
        componentProps={{
          fullWidth: false,
          euiFieldProps: {
            'data-test-subj': 'policyTypeField',
            options: [
              {
                value: 'match',
                text: i18n.translate(
                  'xpack.idxMgmt.enrichPolicyCreate.configurationStep.matchOption',
                  { defaultMessage: 'Match' }
                ),
              },
              {
                value: 'geo_match',
                text: i18n.translate(
                  'xpack.idxMgmt.enrichPolicyCreate.configurationStep.geoMatchOption',
                  { defaultMessage: 'Geo match' }
                ),
              },
              {
                value: 'range',
                text: i18n.translate(
                  'xpack.idxMgmt.enrichPolicyCreate.configurationStep.rangeOption',
                  { defaultMessage: 'Range' }
                ),
              },
            ],
          },
        }}
      />

      <UseField
        path="sourceIndices"
        component={IndicesSelector}
        labelAppend={
          <EuiText size="xs">
            <EuiLink
              target="_blank"
              data-test-subj="uploadFileLink"
              href={getUrlForApp('home', { path: '#/tutorial_directory/fileDataViz' })}
            >
              <FormattedMessage
                id="xpack.idxMgmt.enrichPolicyCreate.configurationStep.uploadFileLink"
                defaultMessage="Upload a file"
              />
            </EuiLink>
          </EuiText>
        }
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'policySourceIndicesField',
          },
          fullWidth: false,
        }}
      />

      <UseField
        path="query"
        component={JsonEditorField}
        componentProps={{
          fullWidth: false,
          helpText: (
            <FormattedMessage
              id="xpack.idxMgmt.enrichPolicyCreate.configurationStep.queryHelpText"
              defaultMessage="Defaults to: {code} query."
              values={{
                code: (
                  <EuiLink
                    external
                    target="_blank"
                    data-test-subj="matchAllQueryLink"
                    href={documentationService.getMatchAllQueryLink()}
                  >
                    <FormattedMessage
                      id="xpack.idxMgmt.enrichPolicyCreate.configurationStep.matchAllLink"
                      defaultMessage="match_all"
                    />
                  </EuiLink>
                ),
              }}
            />
          ),
          codeEditorProps: {
            height: '300px',
            allowFullScreen: true,
            'aria-label': i18n.translate(
              'xpack.idxMgmt.enrichPolicyCreate.configurationStep.ariaLabelQuery',
              {
                defaultMessage: 'Query field data editor',
              }
            ),
            options: {
              lineNumbers: 'off',
              tabSize: 2,
              automaticLayout: true,
            },
          },
        }}
      />

      <EuiSpacer />

      <EuiFlexGroup
        data-test-subj="configureStep"
        justifyContent="spaceBetween"
        style={{ maxWidth: 400 }}
      >
        <EuiFlexItem grow={false} />

        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            color="primary"
            iconSide="right"
            iconType="arrowRight"
            disabled={form.isValid === false}
            data-test-subj="nextButton"
            onClick={onSubmit}
          >
            <FormattedMessage
              id="xpack.idxMgmt.enrichPolicyCreate.configurationStep.nextButtonLabel"
              defaultMessage="Next"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Form>
  );
};
