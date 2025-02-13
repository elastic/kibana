/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback, Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
  EuiSpacer,
  EuiLink,
  EuiCode,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  useForm,
  useFormData,
  Form,
  getUseField,
  getFormRow,
  Field,
  Forms,
  JsonEditorField,
  NumericField,
  RadioGroupField,
} from '../../../../shared_imports';
import { UnitField, timeUnits } from '../../shared';
import { DataRetention } from '../../../../../common';
import { documentationService } from '../../../services/documentation';
import { schemas, nameConfig, nameConfigWithoutValidations } from '../template_form_schemas';
import {
  allowAutoCreateRadios,
  STANDARD_INDEX_MODE,
  TIME_SERIES_MODE,
  LOGSDB_INDEX_MODE,
  LOOKUP_INDEX_MODE,
} from '../../../../../common/constants';
import { indexModeLabels, indexModeDescriptions } from '../../../lib/index_mode_labels';

// Create or Form components with partial props that are common to all instances
const UseField = getUseField({ component: Field });
const FormRow = getFormRow({ titleTag: 'h3' });

function getFieldsMeta(esDocsBase: string) {
  return {
    name: {
      title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.nameTitle', {
        defaultMessage: 'Name',
      }),
      description: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.nameDescription', {
        defaultMessage: 'A unique identifier for this template.',
      }),
      testSubject: 'nameField',
    },
    indexPatterns: {
      title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.indexPatternsTitle', {
        defaultMessage: 'Index patterns',
      }),
      description: i18n.translate(
        'xpack.idxMgmt.templateForm.stepLogistics.indexPatternsDescription',
        {
          defaultMessage: 'The index patterns to apply to the template.',
        }
      ),
      testSubject: 'indexPatternsField',
    },
    createDataStream: {
      title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.dataStreamTitle', {
        defaultMessage: 'Data stream',
      }),
      description: (
        <FormattedMessage
          id="xpack.idxMgmt.templateForm.stepLogistics.dataStreamDescription"
          defaultMessage="The template creates data streams instead of indices. {docsLink}"
          values={{
            docsLink: (
              <EuiLink
                href={documentationService.getDataStreamsDocumentationLink()}
                target="_blank"
                external
              >
                {i18n.translate(
                  'xpack.idxMgmt.templateForm.stepLogistics.dataStreamDocumentionLink',
                  {
                    defaultMessage: 'Learn more.',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      ),
      testSubject: 'dataStreamField',
    },
    indexMode: {
      title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.indexModeTitle', {
        defaultMessage: 'Data stream index mode',
      }),
      description: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.indexModeDescription', {
        defaultMessage:
          'The index.mode setting is used to control settings applied in specific domains like ingestions of time series data or logs.',
      }),
      options: [
        {
          value: STANDARD_INDEX_MODE,
          inputDisplay: indexModeLabels[STANDARD_INDEX_MODE],
          'data-test-subj': 'index_mode_standard',
          dropdownDisplay: (
            <Fragment>
              <strong>{indexModeLabels[STANDARD_INDEX_MODE]}</strong>
              <EuiText size="s" color="subdued">
                <p>{indexModeDescriptions[STANDARD_INDEX_MODE]}</p>
              </EuiText>
            </Fragment>
          ),
        },
        {
          value: TIME_SERIES_MODE,
          inputDisplay: indexModeLabels[TIME_SERIES_MODE],
          'data-test-subj': 'index_mode_time_series',
          dropdownDisplay: (
            <Fragment>
              <strong>{indexModeLabels[TIME_SERIES_MODE]}</strong>
              <EuiText size="s" color="subdued">
                <p>{indexModeDescriptions[TIME_SERIES_MODE]}</p>
              </EuiText>
            </Fragment>
          ),
        },
        {
          value: LOGSDB_INDEX_MODE,
          inputDisplay: indexModeLabels[LOGSDB_INDEX_MODE],
          'data-test-subj': 'index_mode_logsdb',
          dropdownDisplay: (
            <Fragment>
              <strong>{indexModeLabels[LOGSDB_INDEX_MODE]}</strong>
              <EuiText size="s" color="subdued">
                <p>{indexModeDescriptions[LOGSDB_INDEX_MODE]}</p>
              </EuiText>
            </Fragment>
          ),
        },
        {
          value: LOOKUP_INDEX_MODE,
          inputDisplay: indexModeLabels[LOOKUP_INDEX_MODE],
          'data-test-subj': 'index_mode_logsdb',
          dropdownDisplay: (
            <Fragment>
              <strong>{indexModeLabels[LOOKUP_INDEX_MODE]}</strong>
              <EuiText size="s" color="subdued">
                <p>{indexModeDescriptions[LOOKUP_INDEX_MODE]}</p>
              </EuiText>
            </Fragment>
          ),
        },
      ],
      testSubject: 'indexModeField',
    },
    order: {
      title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.orderTitle', {
        defaultMessage: 'Merge order',
      }),
      description: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.orderDescription', {
        defaultMessage: 'The merge order when multiple templates match an index.',
      }),
      testSubject: 'orderField',
    },
    priority: {
      title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.priorityTitle', {
        defaultMessage: 'Priority',
      }),
      description: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.priorityDescription', {
        defaultMessage: 'Only the highest priority template will be applied.',
      }),
      testSubject: 'priorityField',
    },
    version: {
      title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.versionTitle', {
        defaultMessage: 'Version',
      }),
      description: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.versionDescription', {
        defaultMessage: 'A number that identifies the template to external management systems.',
      }),
      testSubject: 'versionField',
    },
    dataRetention: {
      title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.dataRetentionTitle', {
        defaultMessage: 'Data retention',
      }),
      description: i18n.translate(
        'xpack.idxMgmt.templateForm.stepLogistics.dataRetentionDescription',
        {
          defaultMessage:
            'Data will be kept at least this long before being automatically deleted.',
        }
      ),
      unitTestSubject: 'unitDataRetentionField',
    },
    allowAutoCreate: {
      title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.allowAutoCreateTitle', {
        defaultMessage: 'Allow auto create',
      }),
      description: (
        <FormattedMessage
          id="xpack.idxMgmt.templateForm.stepLogistics.allowAutoCreateDescription"
          defaultMessage="This setting overwrites the value of the {settingName} cluster setting. If set to {true} in a template, then indices can be automatically created using that template."
          values={{
            settingName: <EuiCode>action.auto_create_index</EuiCode>,
            true: <EuiCode>true</EuiCode>,
          }}
        />
      ),
      testSubject: 'allowAutoCreateField',
    },
  };
}

interface LogisticsForm {
  [key: string]: any;
}

interface LogisticsFormInternal extends LogisticsForm {
  addMeta: boolean;
  doCreateDataStream: boolean;
}

interface Props {
  defaultValue: LogisticsForm;
  onChange: (content: Forms.Content) => void;
  isEditing?: boolean;
  isLegacy?: boolean;
}

function formDeserializer(formData: LogisticsForm): LogisticsFormInternal {
  return {
    ...formData,
    addMeta: Boolean(formData._meta && Object.keys(formData._meta).length),
    doCreateDataStream: Boolean(formData.dataStream),
  };
}

function getformSerializer(initialTemplateData: LogisticsForm = {}) {
  return (formData: LogisticsFormInternal): LogisticsForm => {
    const { addMeta, doCreateDataStream, ...rest } = formData;
    const dataStream = doCreateDataStream ? initialTemplateData.dataStream ?? {} : undefined;
    return { ...rest, dataStream };
  };
}

export const StepLogistics: React.FunctionComponent<Props> = React.memo(
  ({ defaultValue, isEditing = false, onChange, isLegacy = false }) => {
    const { form } = useForm({
      schema: schemas.logistics,
      defaultValue,
      options: { stripEmptyFields: false },
      serializer: getformSerializer(defaultValue),
      deserializer: formDeserializer,
    });
    const {
      submit,
      isSubmitted,
      isSubmitting,
      isValid: isFormValid,
      getErrors: getFormErrors,
      getFormData,
      setFieldValue,
    } = form;

    const [{ addMeta, doCreateDataStream, lifecycle, indexPatterns: indexPatternsField }] =
      useFormData<{
        addMeta: boolean;
        lifecycle: DataRetention;
        doCreateDataStream: boolean;
        indexPatterns: string[];
      }>({
        form,
        watch: [
          'addMeta',
          'lifecycle.enabled',
          'lifecycle.infiniteDataRetention',
          'doCreateDataStream',
          'indexPatterns',
        ],
      });

    useEffect(() => {
      if (
        indexPatternsField &&
        indexPatternsField.length === 1 &&
        indexPatternsField[0] === 'logs-*-*' &&
        // Only set index mode if index pattern was changed
        defaultValue.indexPatterns !== indexPatternsField
      ) {
        setFieldValue('indexMode', LOGSDB_INDEX_MODE);
      }
    }, [defaultValue.indexPatterns, indexPatternsField, setFieldValue]);

    /**
     * When the consumer call validate() on this step, we submit the form so it enters the "isSubmitted" state
     * and we can display the form errors on top of the forms if there are any.
     */
    const validate = useCallback(async () => {
      return (await submit()).isValid;
    }, [submit]);

    useEffect(() => {
      onChange({
        isValid: isFormValid,
        getData: getFormData,
        validate,
      });
    }, [onChange, isFormValid, validate, getFormData]);

    const {
      name,
      indexPatterns,
      createDataStream,
      indexMode,
      order,
      priority,
      version,
      dataRetention,
      allowAutoCreate,
    } = getFieldsMeta(documentationService.getEsDocsBase());

    return (
      <>
        {/* Header */}
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2 data-test-subj="stepTitle">
                <FormattedMessage
                  id="xpack.idxMgmt.templateForm.stepLogistics.stepTitle"
                  defaultMessage="Logistics"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={documentationService.getTemplatesDocumentationLink(isLegacy)}
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

        <Form
          form={form}
          isInvalid={isSubmitted && !isSubmitting && !isFormValid}
          error={getFormErrors()}
          data-test-subj="stepLogistics"
        >
          {/* Name */}
          <FormRow title={name.title} description={name.description}>
            <UseField
              path="name"
              componentProps={{
                ['data-test-subj']: name.testSubject,
                euiFieldProps: { disabled: isEditing },
              }}
              config={isEditing ? nameConfigWithoutValidations : nameConfig}
            />
          </FormRow>

          {/* Index patterns */}
          <FormRow title={indexPatterns.title} description={indexPatterns.description}>
            <UseField
              path="indexPatterns"
              componentProps={{
                ['data-test-subj']: indexPatterns.testSubject,
              }}
            />
          </FormRow>

          {/* Create data stream */}
          {isLegacy !== true && (
            <FormRow title={createDataStream.title} description={createDataStream.description}>
              <UseField
                path="doCreateDataStream"
                componentProps={{ 'data-test-subj': createDataStream.testSubject }}
              />
            </FormRow>
          )}

          <FormRow title={indexMode.title} description={indexMode.description}>
            <UseField
              path="indexMode"
              componentProps={{
                euiFieldProps: {
                  hasDividers: true,
                  'data-test-subj': indexMode.testSubject,
                  options: indexMode.options,
                },
              }}
            />
          </FormRow>

          {/*
            Since data stream and data retention are settings that are only allowed for non legacy,
            we only need to check if data stream is set to true to show the data retention.
          */}
          {doCreateDataStream && (
            <FormRow
              title={dataRetention.title}
              description={
                <>
                  {dataRetention.description}
                  <EuiSpacer size="m" />
                  <UseField
                    path="lifecycle.enabled"
                    componentProps={{ 'data-test-subj': 'dataRetentionToggle' }}
                  />
                </>
              }
            >
              {lifecycle?.enabled && (
                <UseField
                  path="lifecycle.value"
                  component={NumericField}
                  labelAppend={
                    <UseField
                      path="lifecycle.infiniteDataRetention"
                      data-test-subj="infiniteDataRetentionToggle"
                      componentProps={{
                        euiFieldProps: {
                          compressed: true,
                        },
                      }}
                    />
                  }
                  componentProps={{
                    euiFieldProps: {
                      disabled: lifecycle?.infiniteDataRetention,
                      'data-test-subj': 'valueDataRetentionField',
                      min: 1,
                      append: (
                        <UnitField
                          path="lifecycle.unit"
                          options={timeUnits}
                          disabled={lifecycle?.infiniteDataRetention}
                          euiFieldProps={{
                            'data-test-subj': 'unitDataRetentionField',
                          }}
                        />
                      ),
                    },
                  }}
                />
              )}
            </FormRow>
          )}

          {/* Order */}
          {isLegacy && (
            <FormRow title={order.title} description={order.description}>
              <UseField
                path="order"
                componentProps={{
                  ['data-test-subj']: order.testSubject,
                }}
              />
            </FormRow>
          )}

          {/* Priority */}
          {isLegacy === false && (
            <FormRow title={priority.title} description={priority.description}>
              <UseField
                path="priority"
                componentProps={{
                  ['data-test-subj']: priority.testSubject,
                }}
              />
            </FormRow>
          )}

          {/* Version */}
          <FormRow title={version.title} description={version.description}>
            <UseField
              path="version"
              componentProps={{
                ['data-test-subj']: version.testSubject,
              }}
            />
          </FormRow>

          {/* Allow auto create */}
          {isLegacy === false && (
            <FormRow title={allowAutoCreate.title} description={allowAutoCreate.description}>
              <UseField
                path="allowAutoCreate"
                component={RadioGroupField}
                componentProps={{
                  'data-test-subj': allowAutoCreate.testSubject,
                  euiFieldProps: {
                    options: allowAutoCreateRadios,
                    name: 'allowAutoCreate radio group',
                  },
                }}
              />
            </FormRow>
          )}

          {/* _meta */}
          {isLegacy === false && (
            <FormRow
              title={i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.metaFieldTitle', {
                defaultMessage: '_meta field',
              })}
              description={
                <>
                  <FormattedMessage
                    id="xpack.idxMgmt.templateForm.stepLogistics.metaFieldDescription"
                    defaultMessage="Use the _meta field to store any metadata you want."
                  />
                  <EuiSpacer size="m" />
                  <UseField path="addMeta" data-test-subj="metaToggle" />
                </>
              }
            >
              {addMeta && (
                <UseField
                  path="_meta"
                  component={JsonEditorField}
                  componentProps={{
                    codeEditorProps: {
                      height: '280px',
                      'aria-label': i18n.translate(
                        'xpack.idxMgmt.templateForm.stepLogistics.metaFieldEditorAriaLabel',
                        {
                          defaultMessage: '_meta field data editor',
                        }
                      ),
                      'data-test-subj': 'metaField',
                    },
                  }}
                />
              )}
            </FormRow>
          )}
        </Form>
      </>
    );
  }
);
