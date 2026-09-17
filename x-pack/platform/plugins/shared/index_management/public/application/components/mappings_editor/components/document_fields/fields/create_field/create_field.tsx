/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiOutsideClickDetector,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TrainedModelStat } from '@kbn/ml-common-types/trained_models';
import type { MlPluginStart } from '@kbn/ml-plugin/public';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TYPE_DEFINITION } from '../../../../constants';
import { fieldSerializer } from '../../../../lib';
import { getFieldByPathName, isSemanticTextField } from '../../../../lib/utils';
import { useConfig } from '../../../../config_context';
import { useDispatch, useMappingsState } from '../../../../mappings_state_context';
import { Form, useForm, useFormData } from '../../../../shared_imports';
import type { Field, MainType, NormalizedFields } from '../../../../types';
import {
  applyInlineOptionalDateFormatToField,
  InlineOptionalDateFormatParameter,
  isInlineOptionalDateFormatMappingType,
  NameParameter,
  RenameFieldParameter,
  SourceNameParameter,
  SubTypeParameter,
  TypeParameter,
} from '../../field_parameters';
import { ReferenceFieldSelects } from '../../field_parameters/reference_field_selects';
import { SelectInferenceId } from '../../field_parameters/select_inference_id';
import { FieldBetaBadge } from '../field_beta_badge';
import { useFieldRenameForm } from '../../use_field_rename_form';
import { getRequiredParametersFormForType } from './required_parameters_forms';
import {
  getInlineFieldRenameFormContainerCss,
  getInlineFieldRenameFormRowCss,
  getInlineFieldRenameFormRowGapCss,
  getInlineFieldRenameIdentityClusterCss,
  getInlineFieldRenameTypeClusterCss,
  getInlineFieldRenameTypeFieldCss,
} from '../inline_field_rename_form_layout';

const formWrapper = (props: any) => <form {...props} />;

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    createFieldRequiredProps: css`
      margin-top: ${euiTheme.size.l};
      padding-top: ${euiTheme.size.base};
      border-top: 1px solid ${euiTheme.colors.lightShade};
    `,
    createFieldContent: css`
      position: relative;
    `,
  };
};

export interface ModelIdMapEntry {
  trainedModelId: string;
  isDeployed: boolean;
  isDeployable: boolean;
  isDownloading: boolean;
  modelStats?: TrainedModelStat; // third-party models don't have model stats
}
export interface InferenceToModelIdMap {
  [key: string]: ModelIdMapEntry;
}

export interface SemanticTextInfo {
  isSemanticTextEnabled?: boolean;
  indexName?: string;
  ml?: MlPluginStart;
  setErrorsInTrainedModelDeployment: React.Dispatch<
    React.SetStateAction<Record<string, string | undefined>>
  >;
}
interface Props {
  allFields: NormalizedFields['byId'];
  isRootLevelField: boolean;
  isMultiField?: boolean;
  isCancelable?: boolean;
  onCancelAddingNewFields?: () => void;
  isAddingFields?: boolean;
  semanticTextInfo?: SemanticTextInfo;
  createFieldFormRef?: React.RefObject<HTMLDivElement>;
}

export const CreateField = React.memo(function CreateFieldComponent({
  allFields,
  isRootLevelField,
  isMultiField,
  isCancelable,
  onCancelAddingNewFields,
  isAddingFields,
  semanticTextInfo,
  createFieldFormRef,
}: Props) {
  const { isSemanticTextEnabled } = semanticTextInfo ?? {};
  const dispatch = useDispatch();
  const {
    value: {
      closeCreateFieldOnOutsideClick = true,
      inlineOptionalDateFormatField,
      autoFocusCreateFieldType = true,
    },
  } = useConfig();
  const { euiTheme } = useEuiTheme();
  const {
    fields,
    mappingViewFields,
    documentFields: { status: documentFieldsStatus },
  } = useMappingsState();
  const previousDocumentFieldsStatusRef = useRef<'idle' | 'creatingField' | 'editingField' | 'disabled'>(
    'idle'
  );
  const {
    showFieldRename,
    prepareFieldDataForSubmit,
    notifyFieldSourceNameChange,
    stripSourceNameFromField,
    hasRequiredFieldIdentity,
  } = useFieldRenameForm();
  const fieldTypeInputRef = useRef<HTMLInputElement>(null);
  const [inlineOptionalDateFormatText, setInlineOptionalDateFormatText] = useState('');
  const styles = useStyles();

  const { form } = useForm<Field>({
    serializer: fieldSerializer,
    options: { stripEmptyFields: false },
    id: 'create-field',
  });

  const [{ type, subType }] = useFormData({ form, watch: ['type', 'subType'] });

  const { subscribe } = form;

  useEffect(() => {
    const subscription = subscribe((updatedFieldForm) => {
      dispatch({ type: 'fieldForm.update', value: updatedFieldForm });
    });

    return subscription.unsubscribe;
  }, [dispatch, subscribe]);

  useEffect(() => {
    const previousStatus = previousDocumentFieldsStatusRef.current;
    previousDocumentFieldsStatusRef.current = documentFieldsStatus;

    if (previousStatus !== 'creatingField' && documentFieldsStatus === 'creatingField') {
      form.reset();
      setInlineOptionalDateFormatText('');
    }
  }, [documentFieldsStatus, form]);
  const cancel = () => {
    if (isAddingFields && onCancelAddingNewFields) {
      onCancelAddingNewFields();
    } else {
      dispatch({ type: 'documentField.changeStatus', value: 'idle' });
    }
  };

  const isSemanticText = form.getFormData().type === 'semantic_text';

  useEffect(() => {
    if (!autoFocusCreateFieldType) {
      return;
    }

    createFieldFormRef?.current?.focus();
  }, [autoFocusCreateFieldType, createFieldFormRef]);

  useEffect(() => {
    if (isSemanticText) {
      const allSemanticFields = {
        byId: {
          ...fields.byId,
          ...mappingViewFields.byId,
        },
        rootLevelFields: [],
        aliases: {},
        maxNestedDepth: 0,
      };
      const defaultName = getFieldByPathName(allSemanticFields, 'semantic_text')
        ? ''
        : 'semantic_text';
      if (!form.getFormData().name) {
        form.setFieldValue('name', defaultName);
      }
      if (!form.getFormData().reference_field) {
        form.setFieldValue('reference_field', '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSemanticText]);

  const submitForm = async (
    e?: React.FormEvent,
    exitAfter: boolean = false,
    clickOutside: boolean = false
  ) => {
    if (e) {
      e.preventDefault();
    }

    const fieldIdentity = prepareFieldDataForSubmit(form);
    const { isValid, data } = await form.submit();

    if (isValid && !clickOutside) {
      const fieldData = applyInlineOptionalDateFormatToField(
        stripSourceNameFromField(data),
        typeof data.type === 'string' ? data.type : selectedMappingType,
        inlineOptionalDateFormatText
      );

      if (isSemanticTextField(fieldData) && !fieldData.inference_id) {
        const { inference_id: inferenceId, ...rest } = fieldData;
        dispatch({ type: 'field.add', value: rest });
      } else {
        dispatch({ type: 'field.add', value: fieldData });
      }

      notifyFieldSourceNameChange(fieldIdentity);

      if (exitAfter) {
        cancel();
      }
      form.reset();
    }

    if (!clickOutside && autoFocusCreateFieldType && fieldTypeInputRef.current) {
      fieldTypeInputRef.current.focus();
    }
  };

  const onClickOutside = () => {
    if (!closeCreateFieldOnOutsideClick) {
      return;
    }

    if (!hasRequiredFieldIdentity(form)) {
      if (isCancelable !== false) {
        cancel();
      }
    } else {
      submitForm(undefined, true, true);
    }
  };

  const selectedMappingType = type?.[0]?.value;
  const showInlineOptionalDateFormat =
    inlineOptionalDateFormatField !== undefined &&
    isInlineOptionalDateFormatMappingType(selectedMappingType);

  useEffect(() => {
    if (!showInlineOptionalDateFormat) {
      setInlineOptionalDateFormatText('');
    }
  }, [showInlineOptionalDateFormat]);

  const inlineFieldRenameLayoutCss = useMemo(
    () => [
      getInlineFieldRenameFormContainerCss(),
      getInlineFieldRenameFormRowGapCss({ euiTheme }),
    ],
    [euiTheme]
  );

  const renderFormFields = () => {
    const typeParameter = (
      <TypeParameter
        isRootLevelField={isRootLevelField}
        isMultiField={isMultiField}
        showDocLink
        isSemanticTextEnabled={isSemanticTextEnabled}
        fieldTypeInputRef={autoFocusCreateFieldType ? fieldTypeInputRef : undefined}
      />
    );

    const subTypeParameter =
      type !== undefined ? (
        <SubTypeParameter
          key={type?.[0]?.value}
          type={type?.[0]?.value}
          isMultiField={isMultiField ?? false}
          isRootLevelField={isRootLevelField}
        />
      ) : null;

    if (showFieldRename) {
      return (
        <div css={inlineFieldRenameLayoutCss} data-test-subj="createFieldFieldsLayout">
          <div css={getInlineFieldRenameFormRowCss()}>
            <div css={getInlineFieldRenameTypeClusterCss()} data-test-subj="createFieldTypeRow">
              <EuiFlexGroup gutterSize="s" responsive={false} alignItems="flexStart">
                <EuiFlexItem grow={false} css={getInlineFieldRenameTypeFieldCss()}>
                  {typeParameter}
                </EuiFlexItem>
                {subTypeParameter}
              </EuiFlexGroup>
            </div>

            <div
              css={getInlineFieldRenameIdentityClusterCss()}
              data-test-subj="createFieldIdentityRow"
            >
              <EuiFlexGroup gutterSize="s" responsive={false} alignItems="flexStart">
                {isSemanticText ? (
                  <EuiFlexItem grow={false}>
                    <ReferenceFieldSelects />
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem>
                  <SourceNameParameter />
                </EuiFlexItem>
                <EuiFlexItem>
                  <RenameFieldParameter />
                </EuiFlexItem>
                {showInlineOptionalDateFormat ? (
                  <EuiFlexItem>
                    <InlineOptionalDateFormatParameter
                      labels={inlineOptionalDateFormatField}
                      value={inlineOptionalDateFormatText}
                      onChange={setInlineOptionalDateFormatText}
                    />
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </div>
          </div>
        </div>
      );
    }

    return (
      <EuiFlexGroup gutterSize="s" responsive={false} data-test-subj="createFieldFieldsLayout">
        <EuiFlexItem grow={false}>{typeParameter}</EuiFlexItem>
        {subTypeParameter}
        {isSemanticText ? (
          <EuiFlexItem grow={false}>
            <ReferenceFieldSelects />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <NameParameter isSemanticText={isSemanticText} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const renderRequiredParametersForm = () => {
    if (!type) return null;

    const RequiredParametersForm = getRequiredParametersFormForType(
      type?.[0]?.value,
      subType?.[0]?.value
    );

    if (!RequiredParametersForm) {
      return null;
    }

    const typeDefinition = TYPE_DEFINITION[type?.[0].value as MainType];

    return (
      <div css={styles.createFieldRequiredProps}>
        {typeDefinition?.isBeta ? (
          <>
            <FieldBetaBadge />
            <EuiSpacer size="m" />
          </>
        ) : null}

        <RequiredParametersForm key={subType ?? type} allFields={allFields} />
      </div>
    );
  };

  const renderFormActions = () => (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
      {(isCancelable !== false || isAddingFields) && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={cancel} data-test-subj="cancelButton">
            {i18n.translate('xpack.idxMgmt.mappingsEditor.createField.cancelButtonLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButton
          color="primary"
          fill
          onClick={submitForm}
          type="submit"
          data-test-subj="addButton"
          isDisabled={form.getErrors().length > 0}
        >
          {isMultiField
            ? i18n.translate('xpack.idxMgmt.mappingsEditor.createField.addMultiFieldButtonLabel', {
                defaultMessage: 'Add multi-field',
              })
            : i18n.translate('xpack.idxMgmt.mappingsEditor.createField.addFieldButtonLabel', {
                defaultMessage: 'Add field',
              })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
    </>
  );

  return (
    <>
      <EuiSpacer size="s" />
      <EuiOutsideClickDetector onOutsideClick={onClickOutside}>
        <Form
          form={form}
          FormWrapper={formWrapper}
          onSubmit={submitForm}
          data-test-subj="createFieldForm"
        >
          <EuiPanel color="subdued" paddingSize="m" panelRef={createFieldFormRef} tabIndex={0}>
            <div css={styles.createFieldContent}>
              {renderFormFields()}

              {renderRequiredParametersForm()}

              {isSemanticText && <SelectInferenceId />}
              {renderFormActions()}
            </div>
          </EuiPanel>
        </Form>
      </EuiOutsideClickDetector>
    </>
  );
});
