/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormEvent, FunctionComponent, ReactNode } from 'react';
import React, { useId, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { ESQLLangEditor } from '@kbn/esql/public';
import type { EsqlView } from '@kbn/esql-types';
import {
  ESQL_VIEW_ALREADY_EXISTS_ERROR_TYPE,
  EsqlViewsClientError,
  type EsqlViewsClient,
} from '@kbn/esql-utils';
import {
  getEsqlViewQuerySyntaxError,
  MAX_ESQL_VIEW_DESCRIPTION_LENGTH,
  MAX_ESQL_VIEW_QUERY_LENGTH,
  validateEsqlViewName,
  type EsqlViewNameValidationError,
} from './esql_view_validation';
import { translations } from './translations';

interface EsqlViewFormProps {
  client: EsqlViewsClient;
  view?: EsqlView;
  onClose: () => void;
  onSave: () => Promise<void>;
}

const DEFAULT_ESQL_VIEW_QUERY = 'FROM kibana_sample_data_ecommerce | WHERE KQL("term")';

type NameConflict = { type: 'existingView' } | { type: 'otherResource'; details: string };

const getNameValidationMessage = (
  validationError: EsqlViewNameValidationError | undefined
): string | undefined => {
  switch (validationError) {
    case 'required':
      return translations.nameRequiredErrorMessage;
    case 'invalidFormat':
      return translations.nameInvalidFormatErrorMessage;
    case 'tooLong':
      return translations.nameTooLongErrorMessage;
    default:
      return undefined;
  }
};

export const EsqlViewForm: FunctionComponent<EsqlViewFormProps> = ({
  client,
  view,
  onClose,
  onSave,
}) => {
  const titleId = useId();
  const formId = useId();
  const isEditing = view !== undefined;
  const [name, setName] = useState(view?.name ?? '');
  const [description, setDescription] = useState(view?.description ?? '');
  const [query, setQuery] = useState(view?.query ?? DEFAULT_ESQL_VIEW_QUERY);
  const [isNameTouched, setIsNameTouched] = useState(false);
  const [queryError, setQueryError] = useState<string>();
  const [nameConflict, setNameConflict] = useState<NameConflict>();
  const [saveError, setSaveError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  const nameValidationError =
    !isEditing && isNameTouched ? getNameValidationMessage(validateEsqlViewName(name)) : undefined;
  const descriptionError =
    description.length > MAX_ESQL_VIEW_DESCRIPTION_LENGTH
      ? translations.descriptionTooLongErrorMessage
      : undefined;

  const nameError: ReactNode =
    nameConflict?.type === 'existingView' ? (
      translations.viewAlreadyExistsErrorMessage
    ) : nameConflict?.type === 'otherResource' ? (
      <span>
        {translations.nameConflictErrorMessage}{' '}
        <span data-test-subj="esqlViewNameConflictDetails">
          <EuiIconTip
            aria-label={translations.errorDetailsAriaLabel}
            content={nameConflict.details}
            type="question"
          />
        </span>
      </span>
    ) : (
      nameValidationError
    );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsNameTouched(true);
    setNameConflict(undefined);
    setSaveError(undefined);
    setQueryError(undefined);

    if (
      (!isEditing && validateEsqlViewName(name)) ||
      description.length > MAX_ESQL_VIEW_DESCRIPTION_LENGTH
    ) {
      return;
    }

    if (query.trim().length === 0) {
      setQueryError(translations.queryRequiredErrorMessage);
      return;
    }

    if (query.length > MAX_ESQL_VIEW_QUERY_LENGTH) {
      setQueryError(translations.queryTooLongErrorMessage);
      return;
    }

    setIsSaving(true);
    try {
      const syntaxError = await getEsqlViewQuerySyntaxError(query);
      if (syntaxError) {
        setQueryError(translations.querySyntaxErrorMessage(syntaxError));
        return;
      }

      const request = {
        name,
        query,
        description: description.trim().length > 0 ? description : undefined,
      };
      if (isEditing) {
        await client.updateView(request);
      } else {
        await client.createView(request);
      }

      await onSave();
    } catch (error) {
      if (error instanceof EsqlViewsClientError) {
        if (error.errorType === ESQL_VIEW_ALREADY_EXISTS_ERROR_TYPE) {
          setNameConflict({ type: 'existingView' });
        } else if (error.errorType === 'resource_already_exists_exception') {
          setNameConflict({ type: 'otherResource', details: error.message });
        } else {
          setSaveError(error.message);
        }
      } else {
        setSaveError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <EuiFlyout
      aria-labelledby={titleId}
      data-test-subj="esqlViewFormFlyout"
      onClose={onClose}
      ownFocus
      size="l"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {isEditing ? translations.editFlyoutTitle : translations.createFlyoutTitle}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="xs">
          <p>{translations.flyoutSubtitle}</p>
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm component="form" id={formId} onSubmit={handleSubmit}>
          <EuiTitle size="s">
            <h3>{translations.viewDetailsTitle}</h3>
          </EuiTitle>
          <EuiText color="subdued" size="s">
            <p>{translations.viewDetailsDescription}</p>
          </EuiText>

          <EuiSpacer size="m" />

          <EuiFormRow
            error={nameError}
            fullWidth
            helpText={translations.viewNameDescription}
            isInvalid={Boolean(nameError)}
            label={translations.viewNameLabel}
          >
            <EuiFieldText
              data-test-subj="esqlViewNameInput"
              disabled={isSaving}
              fullWidth
              isInvalid={Boolean(nameError)}
              onChange={({ target }) => {
                setName(target.value);
                setIsNameTouched(true);
                setNameConflict(undefined);
                setSaveError(undefined);
              }}
              placeholder={translations.viewNamePlaceholder}
              readOnly={isEditing}
              value={name}
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          <EuiFormRow
            error={descriptionError}
            fullWidth
            helpText={translations.viewDescriptionDescription}
            isInvalid={Boolean(descriptionError)}
            label={translations.viewDescriptionLabel}
          >
            <EuiTextArea
              data-test-subj="esqlViewDescriptionInput"
              disabled={isSaving}
              fullWidth
              isInvalid={Boolean(descriptionError)}
              onChange={({ target }) => {
                setDescription(target.value);
                setSaveError(undefined);
              }}
              placeholder={translations.viewDescriptionPlaceholder}
              rows={1}
              value={description}
            />
          </EuiFormRow>

          <EuiSpacer size="l" />

          <EuiTitle size="s">
            <h3>{translations.viewQueryTitle}</h3>
          </EuiTitle>
          <EuiText color="subdued" size="s">
            <p>{translations.viewQueryDescription}</p>
          </EuiText>

          <EuiSpacer size="m" />

          <EuiFormRow error={queryError} fullWidth isInvalid={Boolean(queryError)}>
            <ESQLLangEditor
              dataTestSubj="esqlViewQueryEditor"
              disableAutoFocus
              editorIsInline
              errors={queryError ? [new Error(queryError)] : []}
              hasOutline
              hideQueryHistory
              hideRunQueryButton
              isDisabled={isSaving}
              mergeExternalMessages
              onTextLangQueryChange={(nextQuery) => {
                setQuery(nextQuery.esql);
                setQueryError(undefined);
                setSaveError(undefined);
              }}
              onTextLangQuerySubmit={async () => {}}
              query={{ esql: query }}
            />
          </EuiFormRow>

          {saveError && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                announceOnMount
                color="danger"
                data-test-subj="esqlViewSaveError"
                iconType="warning"
                title={translations.saveErrorTitle}
              >
                <p>{saveError}</p>
              </EuiCallOut>
            </>
          )}
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="esqlViewCancelButton" onClick={onClose}>
              {translations.cancelButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="esqlViewSaveButton"
              fill
              form={formId}
              isLoading={isSaving}
              type="submit"
            >
              {isEditing ? translations.saveButtonLabel : translations.createButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
