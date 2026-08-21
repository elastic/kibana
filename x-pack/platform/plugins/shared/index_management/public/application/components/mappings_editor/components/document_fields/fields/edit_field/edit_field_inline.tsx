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
import React, { useEffect, useMemo, useRef } from 'react';

import { TYPE_DEFINITION } from '../../../../constants';
import { fieldDeserializer, fieldSerializer } from '../../../../lib';
import { useDispatch } from '../../../../mappings_state_context';
import { Form, useForm, useFormData } from '../../../../shared_imports';
import type { Field, MainType, NormalizedField, NormalizedFields } from '../../../../types';
import { NameParameter, SubTypeParameter, TypeParameter } from '../../field_parameters';
import { ReferenceFieldSelects } from '../../field_parameters/reference_field_selects';
import { SelectInferenceId } from '../../field_parameters/select_inference_id';
import { getRequiredParametersFormForType } from '../create_field/required_parameters_forms';
import { FieldBetaBadge } from '../field_beta_badge';
import type { SemanticTextInfo } from '../create_field/create_field';
import { ModalConfirmationDeleteFields } from '../modal_confirmation_delete_fields';
import { useUpdateField } from './use_update_field';

const formWrapper = (props: React.FormHTMLAttributes<HTMLFormElement>) => <form {...props} />;

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    editFieldRequiredProps: css`
      margin-top: ${euiTheme.size.l};
      padding-top: ${euiTheme.size.base};
      border-top: 1px solid ${euiTheme.colors.lightShade};
    `,
    editFieldContent: css`
      position: relative;
    `,
  };
};

interface Props {
  field: NormalizedField;
  allFields: NormalizedFields['byId'];
  isRootLevelField: boolean;
  isMultiField?: boolean;
  semanticTextInfo?: SemanticTextInfo;
}

export const EditFieldInline = React.memo(function EditFieldInlineComponent({
  field,
  allFields,
  isRootLevelField,
  isMultiField,
  semanticTextInfo,
}: Props) {
  const { isSemanticTextEnabled } = semanticTextInfo ?? {};
  const dispatch = useDispatch();
  const { updateField, modal } = useUpdateField();
  const fieldTypeInputRef = useRef<HTMLInputElement>(null);
  const editFieldFormRef = useRef<HTMLDivElement>(null);
  const styles = useStyles();

  const formDefaultValue = useMemo(() => ({ ...field.source }), [field.source]);

  const { form } = useForm<Field>({
    defaultValue: formDefaultValue,
    serializer: fieldSerializer,
    deserializer: fieldDeserializer,
    options: { stripEmptyFields: false },
    id: 'edit-field-inline',
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
    if (editFieldFormRef.current) {
      editFieldFormRef.current.focus();
    }
  }, []);

  const exitEdit = () => {
    dispatch({ type: 'documentField.changeStatus', value: 'idle' });
  };

  const isSemanticText = form.getFormData().type === 'semantic_text';

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
      updateField({ ...field, source: data });

      if (exitAfter) {
        exitEdit();
      }
    }

    if (!clickOutside && fieldTypeInputRef.current) {
      fieldTypeInputRef.current.focus();
    }
  };

  const onClickOutside = () => {
    const name = form.getFields().name.value as string;

    if (name.trim() === '') {
      exitEdit();
    } else {
      submitForm(undefined, true, true);
    }
  };

  const renderFormFields = () => (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <TypeParameter
          isRootLevelField={isRootLevelField}
          isMultiField={isMultiField}
          showDocLink
          isSemanticTextEnabled={isSemanticTextEnabled}
          fieldTypeInputRef={fieldTypeInputRef}
        />
      </EuiFlexItem>

      {type !== undefined && (
        <SubTypeParameter
          key={type?.[0]?.value}
          type={type?.[0]?.value}
          isMultiField={isMultiField ?? false}
          isRootLevelField={isRootLevelField}
          defaultValueType={field.source.type}
        />
      )}

      {isSemanticText && (
        <EuiFlexItem grow={false}>
          <ReferenceFieldSelects />
        </EuiFlexItem>
      )}

      <EuiFlexItem>
        <NameParameter isSemanticText={isSemanticText} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const renderRequiredParametersForm = () => {
    if (!type) {
      return null;
    }

    const RequiredParametersForm = getRequiredParametersFormForType(
      type?.[0]?.value,
      subType?.[0]?.value
    );

    if (!RequiredParametersForm) {
      return null;
    }

    const typeDefinition = TYPE_DEFINITION[type?.[0].value as MainType];

    return (
      <div css={styles.editFieldRequiredProps}>
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
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={exitEdit} data-test-subj="cancelButton">
          {i18n.translate('xpack.idxMgmt.mappingsEditor.createField.cancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          color="primary"
          fill
          onClick={submitForm}
          type="submit"
          data-test-subj="editFieldUpdateButton"
          isDisabled={form.getErrors().length > 0}
        >
          {i18n.translate('xpack.idxMgmt.mappingsEditor.editFieldUpdateButtonLabel', {
            defaultMessage: 'Update',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      {modal.isOpen ? <ModalConfirmationDeleteFields {...modal.props} /> : null}
      <EuiSpacer size="s" />
      <EuiOutsideClickDetector onOutsideClick={onClickOutside}>
        <Form
          form={form}
          FormWrapper={formWrapper}
          onSubmit={submitForm}
          data-test-subj="editFieldForm"
        >
          <EuiPanel color="subdued" paddingSize="m" panelRef={editFieldFormRef} tabIndex={0}>
            <div css={styles.editFieldContent}>
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
