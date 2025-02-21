/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiOutsideClickDetector,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TrainedModelStat } from '@kbn/ml-plugin/common/types/trained_models';
import { MlPluginStart } from '@kbn/ml-plugin/public';
import classNames from 'classnames';
import React, { useEffect, useRef } from 'react';
import { TYPE_DEFINITION } from '../../../../constants';
import { fieldSerializer } from '../../../../lib';
import { getFieldByPathName, isSemanticTextField } from '../../../../lib/utils';
import { useDispatch, useMappingsState } from '../../../../mappings_state_context';
import { Form, useForm, useFormData } from '../../../../shared_imports';
import { Field, MainType, NormalizedFields } from '../../../../types';
import { NameParameter, SubTypeParameter, TypeParameter } from '../../field_parameters';
import { ReferenceFieldSelects } from '../../field_parameters/reference_field_selects';
import { SelectInferenceId } from '../../field_parameters/select_inference_id';
import { FieldBetaBadge } from '../field_beta_badge';
import { getRequiredParametersFormForType } from './required_parameters_forms';

const formWrapper = (props: any) => <form {...props} />;

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
  paddingLeft?: number;
  isCancelable?: boolean;
  maxNestedDepth?: number;
  onCancelAddingNewFields?: () => void;
  isAddingFields?: boolean;
  semanticTextInfo?: SemanticTextInfo;
  createFieldFormRef?: React.RefObject<HTMLDivElement>;
}

export const CreateField = React.memo(function CreateFieldComponent({
  allFields,
  isRootLevelField,
  isMultiField,
  paddingLeft,
  isCancelable,
  maxNestedDepth,
  onCancelAddingNewFields,
  isAddingFields,
  semanticTextInfo,
  createFieldFormRef,
}: Props) {
  const { isSemanticTextEnabled } = semanticTextInfo ?? {};
  const dispatch = useDispatch();
  const { fields, mappingViewFields } = useMappingsState();
  const fieldTypeInputRef = useRef<HTMLInputElement>(null);

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
  const cancel = () => {
    if (isAddingFields && onCancelAddingNewFields) {
      onCancelAddingNewFields();
    } else {
      dispatch({ type: 'documentField.changeStatus', value: 'idle' });
    }
  };

  const isSemanticText = form.getFormData().type === 'semantic_text';

  useEffect(() => {
    if (createFieldFormRef?.current) createFieldFormRef?.current.focus();
  }, [createFieldFormRef]);

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
      const referenceField =
        Object.values(allSemanticFields.byId)
          .find((field) => field.source.type === 'text' && !field.isMultiField)
          ?.path.join('.') || '';
      if (!form.getFormData().name) {
        form.setFieldValue('name', defaultName);
      }
      if (!form.getFormData().reference_field) {
        form.setFieldValue('reference_field', referenceField);
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

    const { isValid, data } = await form.submit();

    if (isValid && !clickOutside) {
      if (isSemanticTextField(data) && !data.inference_id) {
        const { inference_id: inferenceId, ...rest } = data;
        dispatch({ type: 'field.add', value: rest });
      } else {
        dispatch({ type: 'field.add', value: data });
      }

      if (exitAfter) {
        cancel();
      }
      form.reset();
    }

    if (fieldTypeInputRef.current) {
      fieldTypeInputRef.current.focus();
    }
  };

  const onClickOutside = () => {
    const name = form.getFields().name.value as string;

    if (name.trim() === '') {
      if (isCancelable !== false) {
        cancel();
      }
    } else {
      submitForm(undefined, true, true);
    }
  };

  const renderFormFields = () => (
    <EuiFlexGroup gutterSize="s">
      {/* Field type */}
      <EuiFlexItem grow={false}>
        <TypeParameter
          isRootLevelField={isRootLevelField}
          isMultiField={isMultiField}
          showDocLink
          isSemanticTextEnabled={isSemanticTextEnabled}
          fieldTypeInputRef={fieldTypeInputRef}
        />
      </EuiFlexItem>

      {/* Field subType (if any) */}
      {type !== undefined && (
        <SubTypeParameter
          key={type?.[0]?.value}
          type={type?.[0]?.value}
          isMultiField={isMultiField ?? false}
          isRootLevelField={isRootLevelField}
        />
      )}

      {/* Field reference_field for semantic_text field type */}
      {isSemanticText && (
        <EuiFlexItem grow={false}>
          <ReferenceFieldSelects />
        </EuiFlexItem>
      )}

      {/* Field name */}
      <EuiFlexItem>
        <NameParameter isSemanticText={isSemanticText} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

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
      <div className="mappingsEditor__createFieldRequiredProps">
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
          <EuiPanel
            color="subdued"
            paddingSize="m"
            className={classNames('mappingsEditor__createFieldWrapper', {
              'mappingsEditor__createFieldWrapper--toggle':
                Boolean(maxNestedDepth) && maxNestedDepth! > 0,
              'mappingsEditor__createFieldWrapper--multiField': isMultiField,
            })}
            panelRef={createFieldFormRef}
            tabIndex={0}
          >
            <div className="mappingsEditor__createFieldContent">
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
