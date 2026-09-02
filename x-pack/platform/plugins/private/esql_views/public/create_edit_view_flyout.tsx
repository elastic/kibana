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
import type { CoreStart, HttpStart, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import { getESQLQueryVariables, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { ESQLLangEditor } from '@kbn/esql/public';
import { ESQLDataGrid } from '@kbn/esql-datagrid/public';
import type { EsqlView } from './mock_views';
import { finalizeViewName, sanitizeViewNameInput } from './services/name_utils';
import { fetchView, upsertView } from './services/views_client';
import { setLocalViewMetadata } from './services/local_metadata';
import { runMockQueryPreview, type MockQueryPreviewResult } from './services/mock_query_preview';

const DEFAULT_QUERY = 'FROM kibana_sample_data_ecommerce | WHERE KQL("term")';

// Match V2/V3: named EUI sizes resolve to viewport-relative percentages, so pin a
// literal pixel width instead. 992px matches `size="l"`'s max-width.
const MAIN_FLYOUT_WIDTH = 992;

export interface CreateEditEsqlViewFlyoutProps {
  mode: 'create' | 'edit';
  initialView?: EsqlView;
  /**
   * Used only in `create` mode, as a lower-priority fallback to `initialView`'s query, to seed
   * the editor with a query the caller already has in hand (e.g. Discover's current ES|QL query)
   * instead of the flyout's own placeholder `DEFAULT_QUERY`. Only honored by the V2 flyout today
   * -- see `create_edit_view_flyout_v2.tsx`.
   */
  initialQuery?: string;
  /**
   * When set (together with `core`), the success toast shown after a save includes a link to
   * this URL (e.g. Discover linking back to the ES|QL Views list in Stack Management). Only
   * honored by the V2 flyout today.
   */
  manageViewsUrl?: string;
  /** Required to render `manageViewsUrl` as a link inside the (otherwise plain-string) toast. */
  core?: CoreStart;
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
    setName(sanitizeViewNameInput(event.target.value));
    setNameError(undefined);
  }, []);

  // Collapsing repeated separators and trimming leading/trailing ones only happens once the
  // name is finalized (here, and again defensively in `handleSubmit`) -- see
  // `sanitizeViewNameInput`'s doc comment for why that can't happen on every keystroke.
  const handleNameBlur = useCallback(() => {
    setName((currentName) => finalizeViewName(currentName));
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
    // Defensively finalize again here (not just on blur) in case the field was never blurred --
    // e.g. pasting a name and immediately clicking Create.
    const finalName = finalizeViewName(name);
    if (!finalName) {
      setName(finalName);
      setNameError(
        i18n.translate('esqlViews.flyout.nameRequiredError', {
          defaultMessage: 'Enter a name.',
        })
      );
      return;
    }
    setName(finalName);
    if (!esqlText.trim()) {
      notifications.toasts.addWarning(
        i18n.translate('esqlViews.flyout.queryRequiredWarning', {
          defaultMessage: 'Enter an ES|QL query before saving.',
        })
      );
      return;
    }
    // ES|QL views can't contain query parameters at all (see
    // https://www.elastic.co/docs/reference/query-languages/esql/esql-views#_query_parameters),
    // so a query still referencing e.g. `?_tstart`/`?_tend` or an ES|QL Control variable would
    // otherwise just fail server-side with an opaque "Bad Request".
    const unresolvedParams = getESQLQueryVariables(esqlText);
    if (unresolvedParams.length) {
      notifications.toasts.addWarning(
        i18n.translate('esqlViews.flyout.queryHasParamsWarning', {
          defaultMessage:
            'Remove {count, plural, one {the parameter} other {the parameters}} {params} before saving -- ES|QL views can’t contain query parameters.',
          values: {
            count: unresolvedParams.length,
            params: unresolvedParams.map((param) => `?${param}`).join(', '),
          },
        })
      );
      return;
    }

    setIsSaving(true);
    try {
      if (mode === 'create') {
        const existing = await fetchView(http, finalName);
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

      await upsertView(http, finalName, esqlText);

      const lastUpdated = new Date().toISOString();
      const createdBy =
        initialView?.createdBy ??
        i18n.translate('esqlViews.flyout.currentUserLabel', { defaultMessage: 'You' });
      setLocalViewMetadata(finalName, { description, createdBy, lastUpdated, query: esqlText });

      notifications.toasts.addSuccess(
        mode === 'create'
          ? i18n.translate('esqlViews.flyout.createSuccessToast', {
              defaultMessage: 'View "{name}" was created.',
              values: { name: finalName },
            })
          : i18n.translate('esqlViews.flyout.updateSuccessToast', {
              defaultMessage: 'View "{name}" was updated.',
              values: { name: finalName },
            })
      );

      onSaved({
        name: finalName,
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
          values: { name: finalName },
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
      size={MAIN_FLYOUT_WIDTH}
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
            (name.trim()
              ? i18n.translate('esqlViews.flyout.nameEsqlHelpText', {
                  defaultMessage: 'Used in ES|QL queries as {query}',
                  values: { query: `FROM ${name.trim()}` },
                })
              : i18n.translate('esqlViews.flyout.nameHelpText', {
                  defaultMessage:
                    'Unique name for use in queries. All lowercase, dash, underscore, and numbers are supported',
                }))
          }
          isInvalid={Boolean(nameError)}
          error={nameError}
          fullWidth
        >
          <EuiFieldText
            value={name}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            placeholder={i18n.translate('esqlViews.flyout.namePlaceholder', {
              defaultMessage: 'e.g. my-dataset',
            })}
            disabled={mode === 'edit'}
            isInvalid={Boolean(nameError)}
            fullWidth
            data-test-subj="esqlViewsNameInput"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('esqlViews.flyout.descriptionLabel', {
            defaultMessage: 'Description (optional)',
          })}
          helpText={i18n.translate('esqlViews.flyout.descriptionHelpText', {
            defaultMessage: 'A brief description to help identify this view.',
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
