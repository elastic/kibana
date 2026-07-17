/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiNotificationBadge,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { ESQLLangEditor } from '@kbn/esql/public';
import { ESQLDataGrid } from '@kbn/esql-datagrid/public';
import type { EsqlView } from './mock_views';
import { slugifyViewName } from './services/name_utils';
import { fetchView, upsertView } from './services/views_client';
import { setLocalViewMetadata } from './services/local_metadata';
import { runMockQueryPreview, type MockQueryPreviewResult } from './services/mock_query_preview';

const DEFAULT_QUERY = 'FROM kibana_sample_data_ecommerce | WHERE KQL("term")';

export interface CreateEditEsqlViewFlyoutProps {
  mode: 'create' | 'edit';
  initialView?: EsqlView;
  http: HttpStart;
  data: DataPublicPluginStart;
  notifications: NotificationsStart;
  onClose: () => void;
  onSaved: (view: EsqlView) => void;
}

export const CreateEditEsqlViewFlyout: React.FunctionComponent<CreateEditEsqlViewFlyoutProps> = ({
  mode,
  initialView,
  http,
  data,
  notifications,
  onClose,
  onSaved,
}) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'esqlViewsFlyoutTitle' });

  const [name, setName] = useState(initialView?.name ?? '');
  const [nameError, setNameError] = useState<string>();
  const [description, setDescription] = useState(initialView?.description ?? '');
  const [query, setQuery] = useState<AggregateQuery>({
    esql: initialView?.query ?? DEFAULT_QUERY,
  });
  const [isSaving, setIsSaving] = useState(false);

  const [previewError, setPreviewError] = useState<Error>();
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<MockQueryPreviewResult>();
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  const handleNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setName(slugifyViewName(event.target.value));
    setNameError(undefined);
  }, []);

  const onTextLangQueryChange = useCallback((nextQuery: AggregateQuery) => {
    setQuery(nextQuery);
  }, []);

  const onTextLangQuerySubmit = useCallback(
    async (submittedQuery?: AggregateQuery) => {
      const esql = submittedQuery && 'esql' in submittedQuery ? submittedQuery.esql : undefined;
      if (!esql?.trim()) {
        return;
      }
      setPreviewError(undefined);
      setIsPreviewLoading(true);
      try {
        const result = await runMockQueryPreview(data, esql);
        setPreviewResult(result);
        setIsAccordionOpen(false);
      } catch (error) {
        setPreviewError(error as Error);
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [data]
  );

  const esqlText = 'esql' in query ? query.esql : '';

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setNameError(
        i18n.translate('esqlViews.flyout.nameRequiredError', {
          defaultMessage: 'Enter a name.',
        })
      );
      return;
    }
    if (!esqlText.trim()) {
      notifications.toasts.addWarning(
        i18n.translate('esqlViews.flyout.queryRequiredWarning', {
          defaultMessage: 'Enter an ES|QL query before saving.',
        })
      );
      return;
    }

    setIsSaving(true);
    try {
      if (mode === 'create') {
        const existing = await fetchView(http, name);
        if (existing) {
          setNameError(
            i18n.translate('esqlViews.flyout.nameTakenError', {
              defaultMessage: 'A view with this name already exists.',
            })
          );
          setIsSaving(false);
          return;
        }
      }

      await upsertView(http, name, esqlText);

      const lastUpdated = new Date().toISOString();
      const createdBy =
        initialView?.createdBy ??
        i18n.translate('esqlViews.flyout.currentUserLabel', { defaultMessage: 'You' });
      setLocalViewMetadata(name, { description, createdBy, lastUpdated, query: esqlText });

      notifications.toasts.addSuccess(
        mode === 'create'
          ? i18n.translate('esqlViews.flyout.createSuccessToast', {
              defaultMessage: 'View "{name}" was created.',
              values: { name },
            })
          : i18n.translate('esqlViews.flyout.updateSuccessToast', {
              defaultMessage: 'View "{name}" was updated.',
              values: { name },
            })
      );

      onSaved({
        name,
        description,
        query: esqlText,
        source: getIndexPatternFromESQLQuery(esqlText) || '\u2014',
        createdBy,
        lastUpdated,
      });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      notifications.toasts.addDanger({
        title: i18n.translate('esqlViews.flyout.saveErrorToast', {
          defaultMessage: 'Failed to save view "{name}"',
          values: { name },
        }),
        text: message,
      });
    } finally {
      setIsSaving(false);
    }
  }, [description, esqlText, http, initialView, mode, name, notifications, onClose, onSaved]);

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      ownFocus
      aria-labelledby={flyoutTitleId}
      data-test-subj="esqlViewsCreateEditFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>
            {mode === 'create'
              ? i18n.translate('esqlViews.flyout.createTitle', {
                  defaultMessage: 'Create ES|QL view',
                })
              : i18n.translate('esqlViews.flyout.editTitle', { defaultMessage: 'Edit ES|QL view' })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('esqlViews.flyout.detailsSectionTitle', {
              defaultMessage: 'ES|QL view details',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFormRow
          label={i18n.translate('esqlViews.flyout.nameLabel', { defaultMessage: 'Name' })}
          helpText={
            !nameError &&
            i18n.translate('esqlViews.flyout.nameHelpText', {
              defaultMessage: 'Lowercase letters, numbers, and hyphens only.',
            })
          }
          isInvalid={Boolean(nameError)}
          error={nameError}
          fullWidth
        >
          <EuiFieldText
            value={name}
            onChange={handleNameChange}
            placeholder={i18n.translate('esqlViews.flyout.textPlaceholder', {
              defaultMessage: 'Type text',
            })}
            disabled={mode === 'edit'}
            isInvalid={Boolean(nameError)}
            fullWidth
            data-test-subj="esqlViewsNameInput"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('esqlViews.flyout.descriptionLabel', {
            defaultMessage: 'Description',
          })}
          fullWidth
        >
          <EuiFieldText
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={i18n.translate('esqlViews.flyout.textPlaceholder', {
              defaultMessage: 'Type text',
            })}
            fullWidth
            data-test-subj="esqlViewsDescriptionInput"
          />
        </EuiFormRow>
        <EuiSpacer size="l" />
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('esqlViews.flyout.querySectionTitle', {
              defaultMessage: 'ES|QL query',
            })}
          </h3>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('esqlViews.flyout.querySectionHelpText', {
              defaultMessage: 'You can write a custom query, or use a recent or starred one.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <ESQLLangEditor
          query={query}
          onTextLangQueryChange={onTextLangQueryChange}
          onTextLangQuerySubmit={onTextLangQuerySubmit}
          errors={previewError ? [previewError] : undefined}
          isLoading={isPreviewLoading}
          editorIsInline
          hasOutline
          queryStats={
            previewResult
              ? {
                  durationInMs: previewResult.durationInMs,
                  totalDocumentsProcessed: previewResult.totalDocumentsProcessed,
                }
              : undefined
          }
          dataTestSubj="esqlViewsQueryEditor"
        />
        <EuiSpacer size="m" />
        <EuiAccordion
          id="esqlViewsResultsAccordion"
          buttonContent={
            <EuiTitle size="xxs">
              <h4>
                {i18n.translate('esqlViews.flyout.resultsAccordionTitle', {
                  defaultMessage: 'ES|QL Query Results',
                })}
              </h4>
            </EuiTitle>
          }
          forceState={isAccordionOpen ? 'open' : 'closed'}
          onToggle={setIsAccordionOpen}
          extraAction={
            previewResult ? (
              <EuiNotificationBadge size="m" color="subdued">
                {previewResult.rows.length}
              </EuiNotificationBadge>
            ) : undefined
          }
          data-test-subj="esqlViewsResultsAccordion"
        >
          <EuiSpacer size="s" />
          {previewResult ? (
            <ESQLDataGrid
              rows={previewResult.rows}
              columns={previewResult.columns}
              dataView={previewResult.dataView}
              query={query}
              flyoutType="overlay"
              initialRowHeight={0}
              controlColumnIds={['openDetails']}
            />
          ) : (
            <EuiEmptyPrompt
              titleSize="xs"
              iconType="search"
              title={
                <h4>
                  {i18n.translate('esqlViews.flyout.resultsEmptyPromptTitle', {
                    defaultMessage: 'No results yet',
                  })}
                </h4>
              }
              body={
                <p>
                  {i18n.translate('esqlViews.flyout.resultsEmptyPromptBody', {
                    defaultMessage: 'Run the query above to preview its results here.',
                  })}
                </p>
              }
              data-test-subj="esqlViewsResultsEmptyPrompt"
            />
          )}
        </EuiAccordion>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="esqlViewsFlyoutCancelButton">
              {i18n.translate('esqlViews.flyout.cancelButton', { defaultMessage: 'Cancel' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleSubmit}
              isLoading={isSaving}
              isDisabled={!name.trim() || isSaving}
              data-test-subj="esqlViewsFlyoutSubmitButton"
            >
              {mode === 'create'
                ? i18n.translate('esqlViews.flyout.createButton', { defaultMessage: 'Create' })
                : i18n.translate('esqlViews.flyout.saveButton', { defaultMessage: 'Save' })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
