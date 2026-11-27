/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSkeletonText,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { parseCaseFieldErrors } from '../../../../common/investigations/template_fields';
import { TemplateFieldsFormReady } from '../../../components/case_view/components/template_fields_form_ready';
import type { TemplateFieldsFormApi } from '../../../components/case_view/components/template_fields_form_ready';
import { APPLY_TEMPLATE_MODAL_APPLY } from '../../../common/translations';
import {
  getHttpErrorMessage,
  useInvestigationTypes,
  useRecord,
  useUpdateRecord,
} from '../../hooks';
import { ICONS } from '../../icons';
import { collectExtendedFieldValues, toCamelExtendedFields } from '../fields/field_utils';
import { ManageTemplatesLink } from '../fields/manage_templates_link';
import { ServerErrorsCallout } from '../fields/server_errors_callout';
import { useTypeFields } from '../fields/use_type_fields';
import * as fieldsI18n from '../fields/translations';
import type { InvestigationModalProps } from './modal_props';
import * as i18n from './translations';

/**
 * Changes the investigation type, which is the Cases template of the case. The values of fields
 * the new type shares with the old one are kept; the rest start at the template default.
 */
export const ChangeTypeModal: React.FC<InvestigationModalProps> = ({ record, onClose }) => {
  const titleId = useGeneratedHtmlId();
  const { data: recordData } = useRecord(record.id);
  const {
    data: typesData,
    isLoading: isLoadingTypes,
    isError: isTypesError,
  } = useInvestigationTypes();
  const { mutate: updateRecord, isLoading: isApplying } = useUpdateRecord(record.id, {
    silentErrors: true,
  });

  const theCase = recordData?.case;
  const currentTemplate = theCase?.template ?? null;
  const types = useMemo(() => typesData?.types ?? [], [typesData]);

  const [selectedId, setSelectedId] = useState<string>(currentTemplate?.id ?? '');
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const formApiRef = useRef<TemplateFieldsFormApi | null>(null);

  const selectedType = types.find(({ template_id: templateId }) => templateId === selectedId);
  const { fields, isLoading: isLoadingFields } = useTypeFields(
    selectedType?.template_id,
    selectedType?.version
  );

  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      types.map(({ name, template_id: templateId }) => ({
        key: templateId,
        label: name,
        value: templateId,
      })),
    [types]
  );
  const selectedOptions = options.filter(({ value }) => value === selectedId);
  const extendedFields = useMemo(
    () => toCamelExtendedFields(theCase?.extended_fields),
    [theCase?.extended_fields]
  );

  const isSameType =
    selectedType !== undefined &&
    currentTemplate !== null &&
    currentTemplate.id === selectedType.template_id &&
    currentTemplate.version === selectedType.version;

  const onChange = useCallback((selected: Array<EuiComboBoxOptionOption<string>>) => {
    setServerErrors([]);
    setSelectedId(selected[0]?.value ?? '');
  }, []);

  const onApply = useCallback(async () => {
    if (!selectedType) {
      return;
    }
    const formApi = formApiRef.current;
    if (formApi && !(await formApi.trigger())) {
      return;
    }
    setServerErrors([]);
    updateRecord(
      {
        template: { id: selectedType.template_id, version: selectedType.version },
        extended_fields: collectExtendedFieldValues(formApi?.getValues() ?? {}),
      },
      {
        onSuccess: onClose,
        onError: (error) => {
          const message = getHttpErrorMessage(error);
          const fieldErrors = parseCaseFieldErrors(message);
          setServerErrors(
            fieldErrors.length > 0 ? fieldErrors.map((fieldError) => fieldError.message) : [message]
          );
        },
      }
    );
  }, [selectedType, updateRecord, onClose]);

  const title = currentTemplate ? i18n.CHANGE_TYPE_TITLE : i18n.APPLY_TYPE_TITLE;

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      css={css`
        width: min(560px, 100%);
      `}
      data-test-subj="investigationChangeTypeModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          fullWidth
          label={i18n.CHANGE_TYPE_LABEL}
          labelAppend={<ManageTemplatesLink />}
          isInvalid={isTypesError}
          error={isTypesError ? i18n.CHANGE_TYPE_TYPES_ERROR : undefined}
        >
          <EuiComboBox
            fullWidth
            singleSelection={{ asPlainText: true }}
            isClearable={false}
            options={options}
            selectedOptions={selectedOptions}
            onChange={onChange}
            isLoading={isLoadingTypes || isLoadingFields}
            placeholder={i18n.CHANGE_TYPE_PLACEHOLDER}
            isInvalid={isTypesError}
            data-test-subj="investigationChangeTypeSelect"
          />
        </EuiFormRow>
        {!isLoadingTypes && !isTypesError && types.length === 0 ? (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              size="s"
              color="warning"
              iconType={ICONS.warning}
              title={i18n.CHANGE_TYPE_NO_TYPES}
              data-test-subj="investigationChangeTypeNoTypes"
            />
          </>
        ) : null}
        {currentTemplate ? (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              size="s"
              iconType={ICONS.info}
              title={i18n.CHANGE_TYPE_HINT}
              data-test-subj="investigationChangeTypeHint"
            />
          </>
        ) : null}
        {isLoadingFields ? (
          <>
            <EuiSpacer size="m" />
            <EuiSkeletonText lines={3} aria-label={fieldsI18n.FIELDS_LOADING} />
          </>
        ) : null}
        {selectedType && !isLoadingFields && fields.length > 0 && theCase ? (
          <>
            <EuiSpacer size="m" />
            <div data-test-subj="investigationChangeTypeFields">
              <TemplateFieldsFormReady
                key={selectedType.template_id}
                resolvedFields={fields}
                extendedFields={extendedFields}
                applyDefaults
                formApiRef={formApiRef}
              />
            </div>
          </>
        ) : null}
        {serverErrors.length > 0 ? (
          <>
            <EuiSpacer size="m" />
            <ServerErrorsCallout
              messages={serverErrors}
              title={i18n.CHANGE_TYPE_SERVER_ERROR_TITLE}
              data-test-subj="investigationChangeTypeServerErrors"
            />
          </>
        ) : null}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onClose}
          isDisabled={isApplying}
          data-test-subj="investigationChangeTypeCancel"
        >
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={() => void onApply()}
          isLoading={isApplying}
          isDisabled={!selectedType || isSameType || isLoadingFields || !theCase}
          data-test-subj="investigationChangeTypeApply"
        >
          {APPLY_TEMPLATE_MODAL_APPLY}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
ChangeTypeModal.displayName = 'ChangeTypeModal';
