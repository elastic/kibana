/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { useQueryClient } from '@kbn/react-query';
import { CaseSeverity } from '../../../../common/types/domain';
import type {
  CreateRecordRequest,
  InvestigationPriority,
  RelatedRecord,
} from '../../../../common/investigations/types';
import { parseCaseFieldErrors } from '../../../../common/investigations/template_fields';
import { checkDuplicates } from '../../api/client';
import { investigationKeys } from '../../api/query_keys';
import {
  getHttpErrorMessage,
  useCapabilities,
  useCreateRecord,
  useDuplicateCheck,
  useInvestigationTypes,
} from '../../hooks';
import { SeveritySelector } from '../../../components/severity/selector';
import { useInvestigationsServices } from '../../services';
import { collectExtendedFieldValues } from '../fields/field_utils';
import type { ExtendedFieldsFormApi } from '../fields/extended_fields_form';
import { ManageTemplatesLink } from '../fields/manage_templates_link';
import { ServerErrorsCallout } from '../fields/server_errors_callout';
import { ConfirmModal } from '../shared/confirm_modal';
import { DuplicateStatus } from './duplicate_callout';
import { TypeFieldsSection } from './type_fields_section';
import { MarkdownEditor } from '../../../components/markdown_editor';
import * as i18n from './translations';
import { EMPTY_FORM, hasErrors, validateForm } from './validation';
import type { CreateFormValues } from './validation';

const DUPLICATE_DEBOUNCE_MS = 500;
/** Lens visualisations are not offered in the description. */
const DISABLED_UI_PLUGINS = ['lens'];

/** Priority is the case severity: the form uses the Cases severity selector and its words. */
const SEVERITY_BY_PRIORITY: Record<InvestigationPriority, CaseSeverity> = {
  low: CaseSeverity.LOW,
  medium: CaseSeverity.MEDIUM,
  high: CaseSeverity.HIGH,
  critical: CaseSeverity.CRITICAL,
};
const PRIORITY_BY_SEVERITY: Record<CaseSeverity, InvestigationPriority> = {
  [CaseSeverity.LOW]: 'low',
  [CaseSeverity.MEDIUM]: 'medium',
  [CaseSeverity.HIGH]: 'high',
  [CaseSeverity.CRITICAL]: 'critical',
};

const toOptions = (values: string[]): Array<EuiComboBoxOptionOption<string>> =>
  values.map((value) => ({ label: value }));

const useDebounced = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};

export interface CreateInvestigationFlyoutProps {
  onClose: () => void;
  /** Called with the new record id after it is created. */
  onCreated: (recordId: string) => void;
}

/** The "New investigation" flyout: a validated form with a duplicate check. */
export const CreateInvestigationFlyout: React.FC<CreateInvestigationFlyoutProps> = ({
  onClose,
  onCreated,
}) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'investigationCreateTitle' });
  const descriptionEditorId = useGeneratedHtmlId({ prefix: 'investigationCreateDescription' });
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const {
    data: typesData,
    isLoading: isLoadingTypes,
    isError: isTypesError,
  } = useInvestigationTypes();
  const { data: capabilities } = useCapabilities();
  const { mutate: createRecord, isLoading: isCreating } = useCreateRecord({
    onSuccess: ({ record }) => onCreated(record.id),
    silentErrors: true,
  });
  const fieldsFormRef = useRef<ExtendedFieldsFormApi | null>(null);
  const [areFieldsDirty, setAreFieldsDirty] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const [values, setValues] = useState<CreateFormValues>(EMPTY_FORM);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmedDuplicates, setConfirmedDuplicates] = useState(false);
  const [submitDuplicates, setSubmitDuplicates] = useState<RelatedRecord[] | null>(null);
  const [isCheckingOnSubmit, setIsCheckingOnSubmit] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);

  const types = useMemo(() => typesData?.types ?? [], [typesData]);
  const selectedType = types.find(
    ({ template_id: templateId }) => templateId === values.templateId
  );
  const agentUnavailable = capabilities ? !capabilities.agent_builder_available : false;

  // Preselect the first type once the list arrives.
  useEffect(() => {
    if (values.templateId === '' && types.length > 0) {
      setValues((current) =>
        current.templateId === '' ? { ...current, templateId: types[0].template_id } : current
      );
    }
  }, [types, values.templateId]);

  const duplicateRequest = useMemo(
    () => ({
      entity_names: values.entities.length > 0 ? values.entities : undefined,
      alert_ids: values.alertIds.length > 0 ? values.alertIds : undefined,
    }),
    [values.entities, values.alertIds]
  );
  const debouncedRequest = useDebounced(duplicateRequest, DUPLICATE_DEBOUNCE_MS);
  const isDebouncing = debouncedRequest !== duplicateRequest;
  const duplicateQuery = useDuplicateCheck(debouncedRequest);
  const liveDuplicates = !isDebouncing ? duplicateQuery.data?.related ?? [] : [];
  const visibleDuplicates = submitDuplicates ?? liveDuplicates;

  const errors = useMemo(() => validateForm(values), [values]);
  const isDirty =
    values.title !== '' ||
    values.description !== '' ||
    values.tags.length > 0 ||
    values.entities.length > 0 ||
    values.alertIds.length > 0 ||
    areFieldsDirty;

  const update = useCallback((change: Partial<CreateFormValues>) => {
    setValues((current) => ({ ...current, ...change }));
  }, []);

  const updateIdentifiers = (change: Partial<Pick<CreateFormValues, 'entities' | 'alertIds'>>) => {
    setConfirmedDuplicates(false);
    setSubmitDuplicates(null);
    update(change);
  };

  const buildRequest = (): CreateRecordRequest => ({
    title: values.title.trim(),
    description: values.description.trim(),
    template_id: values.templateId,
    extended_fields: collectExtendedFieldValues(fieldsFormRef.current?.getValues() ?? {}),
    priority: values.priority,
    tags: values.tags,
    ai_enabled: values.aiEnabled && !agentUnavailable,
  });

  /** Shows what Cases refused next to the fields it names; the rest is listed in the flyout. */
  const sendRequest = () => {
    setServerErrors([]);
    createRecord(buildRequest(), {
      onError: (error) => {
        const message = getHttpErrorMessage(error);
        const fieldErrors = parseCaseFieldErrors(message);
        if (fieldErrors.length === 0) {
          setServerErrors([message]);
          return;
        }
        setServerErrors(fieldsFormRef.current?.showServerErrors(fieldErrors) ?? [message]);
      },
    });
  };

  const submit = async () => {
    setShowErrors(true);
    // Validate the type's fields too, so every problem is marked at once.
    const areFieldsValid = (await fieldsFormRef.current?.trigger()) ?? true;
    if (hasErrors(errors) || !areFieldsValid) {
      return;
    }
    const hasIdentifiers = values.entities.length > 0 || values.alertIds.length > 0;
    if (hasIdentifiers && !confirmedDuplicates) {
      setIsCheckingOnSubmit(true);
      try {
        const { related } = await queryClient.fetchQuery(
          investigationKeys.duplicates(duplicateRequest),
          () => checkDuplicates(http, duplicateRequest),
          { staleTime: 0 }
        );
        if (related.length > 0) {
          setSubmitDuplicates(related);
          return;
        }
      } catch {
        // The check is advisory: if it fails, the user can still create the investigation.
      } finally {
        setIsCheckingOnSubmit(false);
      }
    }
    sendRequest();
  };

  const createAnyway = () => {
    setConfirmedDuplicates(true);
    sendRequest();
  };

  const requestClose = () => {
    if (isDirty && !isCreating) {
      setIsDiscardOpen(true);
      return;
    }
    onClose();
  };

  const showError = (message: string | undefined) => (showErrors ? message : undefined);

  return (
    <>
      <EuiFlyout
        onClose={requestClose}
        size="m"
        ownFocus
        aria-labelledby={titleId}
        data-test-subj="investigationCreateFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={titleId}>{i18n.FLYOUT_TITLE}</h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            {i18n.FLYOUT_SUBTITLE}
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiForm
            component="form"
            css={css`
              display: flex;
              flex-direction: column;
              gap: ${euiTheme.size.m};
            `}
            fullWidth
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
            noValidate
          >
            <EuiFormRow
              label={i18n.TITLE_LABEL}
              fullWidth
              isInvalid={Boolean(showError(errors.title))}
              error={showError(errors.title)}
            >
              <EuiFieldText
                fullWidth
                autoFocus
                value={values.title}
                placeholder={i18n.TITLE_PLACEHOLDER}
                isInvalid={Boolean(showError(errors.title))}
                onChange={(event) => update({ title: event.target.value })}
                data-test-subj="investigationCreateTitle"
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.DESCRIPTION_LABEL}
              helpText={i18n.DESCRIPTION_HELP}
              fullWidth
              isInvalid={Boolean(showError(errors.description))}
              error={showError(errors.description)}
            >
              <MarkdownEditor
                ariaLabel={i18n.DESCRIPTION_LABEL}
                editorId={descriptionEditorId}
                value={values.description}
                onChange={(description) => update({ description })}
                height={160}
                disabledUiPlugins={DISABLED_UI_PLUGINS}
                errors={
                  showError(errors.description) ? [String(showError(errors.description))] : []
                }
                data-test-subj="investigationCreateDescription"
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.TYPE_LABEL}
              helpText={i18n.TYPE_HELP}
              labelAppend={<ManageTemplatesLink />}
              fullWidth
              isInvalid={Boolean(showError(errors.templateId)) || isTypesError}
              error={isTypesError ? i18n.TYPES_ERROR : showError(errors.templateId)}
            >
              <EuiSelect
                fullWidth
                isLoading={isLoadingTypes}
                hasNoInitialSelection={values.templateId === ''}
                options={types.map(({ name, template_id: templateId }) => ({
                  value: templateId,
                  text: name,
                }))}
                value={values.templateId}
                isInvalid={Boolean(showError(errors.templateId)) || isTypesError}
                onChange={(event) => {
                  setServerErrors([]);
                  update({ templateId: event.target.value });
                }}
                data-test-subj="investigationCreateType"
              />
            </EuiFormRow>
            {!isLoadingTypes && !isTypesError && types.length === 0 ? (
              <EuiCallOut
                announceOnMount
                size="s"
                color="warning"
                title={i18n.TYPES_NONE}
                data-test-subj="investigationCreateNoTypes"
              />
            ) : null}
            <EuiFormRow label={i18n.PRIORITY_LABEL} fullWidth>
              <SeveritySelector
                selectedSeverity={SEVERITY_BY_PRIORITY[values.priority]}
                onSeverityChange={(severity) =>
                  update({ priority: PRIORITY_BY_SEVERITY[severity] })
                }
                isLoading={false}
                isDisabled={false}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.TAGS_LABEL}
              fullWidth
              isInvalid={Boolean(showError(errors.tags))}
              error={showError(errors.tags)}
            >
              <EuiComboBox
                fullWidth
                noSuggestions
                placeholder={i18n.TAGS_PLACEHOLDER}
                selectedOptions={toOptions(values.tags)}
                onCreateOption={(tag) => {
                  const trimmed = tag.trim();
                  if (trimmed.length > 0 && !values.tags.includes(trimmed)) {
                    update({ tags: [...values.tags, trimmed] });
                  }
                }}
                onChange={(options) => update({ tags: options.map(({ label }) => label) })}
                isInvalid={Boolean(showError(errors.tags))}
                data-test-subj="investigationCreateTags"
              />
            </EuiFormRow>

            {selectedType ? (
              <TypeFieldsSection
                type={selectedType}
                formApiRef={fieldsFormRef}
                onDirtyChange={setAreFieldsDirty}
              />
            ) : null}

            <EuiHorizontalRule margin="m" />
            <EuiFormRow label={i18n.ENTITIES_LABEL} helpText={i18n.ENTITIES_HELP} fullWidth>
              <EuiComboBox
                fullWidth
                noSuggestions
                placeholder={i18n.ENTITIES_PLACEHOLDER}
                selectedOptions={toOptions(values.entities)}
                onCreateOption={(name) => {
                  const trimmed = name.trim();
                  if (trimmed.length > 0 && !values.entities.includes(trimmed)) {
                    updateIdentifiers({ entities: [...values.entities, trimmed] });
                  }
                }}
                onChange={(options) =>
                  updateIdentifiers({ entities: options.map(({ label }) => label) })
                }
                data-test-subj="investigationCreateEntities"
              />
            </EuiFormRow>
            <EuiFormRow label={i18n.ALERT_IDS_LABEL} helpText={i18n.ALERT_IDS_HELP} fullWidth>
              <EuiComboBox
                fullWidth
                noSuggestions
                placeholder={i18n.ALERT_IDS_PLACEHOLDER}
                selectedOptions={toOptions(values.alertIds)}
                onCreateOption={(alertId) => {
                  const trimmed = alertId.trim();
                  if (trimmed.length > 0 && !values.alertIds.includes(trimmed)) {
                    updateIdentifiers({ alertIds: [...values.alertIds, trimmed] });
                  }
                }}
                onChange={(options) =>
                  updateIdentifiers({ alertIds: options.map(({ label }) => label) })
                }
                data-test-subj="investigationCreateAlertIds"
              />
            </EuiFormRow>

            <DuplicateStatus
              isChecking={isDebouncing || duplicateQuery.isFetching}
              isError={duplicateQuery.isError && !isDebouncing}
              related={visibleDuplicates}
              onCreateAnyway={createAnyway}
              isCreating={isCreating}
            />

            <EuiHorizontalRule margin="m" />
            <ServerErrorsCallout
              messages={serverErrors}
              data-test-subj="investigationCreateServerErrors"
            />
            <EuiFormRow fullWidth helpText={agentUnavailable ? i18n.AI_UNAVAILABLE : i18n.AI_HELP}>
              <EuiSwitch
                label={i18n.AI_LABEL}
                checked={values.aiEnabled && !agentUnavailable}
                disabled={agentUnavailable}
                onChange={(event) => update({ aiEnabled: event.target.checked })}
                data-test-subj="investigationCreateAiEnabled"
              />
            </EuiFormRow>
          </EuiForm>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={requestClose} data-test-subj="investigationCreateCancel">
                {i18n.CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isLoading={isCreating || isCheckingOnSubmit}
                onClick={() => void submit()}
                data-test-subj="investigationCreateSubmit"
              >
                {i18n.CREATE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
      {isDiscardOpen ? (
        <ConfirmModal
          title={i18n.DISCARD_TITLE}
          body={i18n.DISCARD_BODY}
          confirmLabel={i18n.DISCARD_CONFIRM}
          cancelLabel={i18n.DISCARD_KEEP_EDITING}
          destructive
          onConfirm={onClose}
          onCancel={() => setIsDiscardOpen(false)}
          data-test-subj="investigationCreateDiscardModal"
        />
      ) : null}
    </>
  );
};
CreateInvestigationFlyout.displayName = 'CreateInvestigationFlyout';
