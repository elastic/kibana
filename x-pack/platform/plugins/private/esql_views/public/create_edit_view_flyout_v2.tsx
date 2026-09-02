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
  EuiLink,
  EuiNotificationBadge,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { Global, css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { AggregateQuery } from '@kbn/es-query';
import { getESQLQueryVariables, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { ESQLLangEditor } from '@kbn/esql/public';
import { ESQLDataGrid } from '@kbn/esql-datagrid/public';
import { finalizeViewName, sanitizeViewNameInput } from './services/name_utils';
import { fetchView, upsertView } from './services/views_client';
import { setLocalViewMetadata } from './services/local_metadata';
import { runMockQueryPreview, type MockQueryPreviewResult } from './services/mock_query_preview';
import type { CreateEditEsqlViewFlyoutProps } from './create_edit_view_flyout';

const DEFAULT_QUERY = 'FROM kibana_sample_data_ecommerce | WHERE KQL("term")';

const MAIN_FLYOUT_TEST_SUBJ = 'esqlViewsCreateEditFlyout';
// Set deep inside `RowViewer` -> `UnifiedDocViewerFlyout` (see `esql_datagrid`/`unified_doc_viewer`
// packages); we don't own that markup, we just target it from the outside.
const DETAILS_FLYOUT_TEST_SUBJ = 'esqlRowDetailsFlyout';
// Doubled attribute selector bumps specificity so this reliably wins over the doc viewer
// flyout's own (also `!important`) styles, regardless of stylesheet insertion order.
const detailsFlyoutSelector = `[data-test-subj="${DETAILS_FLYOUT_TEST_SUBJ}"][data-test-subj="${DETAILS_FLYOUT_TEST_SUBJ}"]`;

// EUI's real managed child flyouts dock flush against the main flyout's *left* edge by
// setting their own `right` offset to the main flyout's rendered width. Named sizes like
// `size="m"` render as a *viewport-relative percentage* (clamped between a min/max), so
// its actual pixel width can't be known upfront -- measuring it at runtime is exactly
// what caused the mismatch here (a resize/layout timing gap made the measured width read
// closer to what an 's'-sized flyout would render). Instead, pin the main flyout to this
// literal pixel width so both flyouts always agree on the same number, no measuring
// needed. 992px matches `size="l"`'s `max-width` (`euiTheme.breakpoint.l`).
const MAIN_FLYOUT_WIDTH = 992;

/**
 * V2 prototype only: makes the "ES|QL Query Results" details flyout *look* like a child
 * flyout docked to the left of this one, instead of a full-width overlay that hides it.
 *
 * This is a purely visual approximation done with global CSS (scoped to while this
 * component is mounted, via emotion's `Global`) -- it does not use EUI's real managed
 * flyout session/child mechanism. That would require the shared `esql_datagrid` and/or
 * `unified_doc_viewer` packages to expose a way to opt into `session="inherit"`, which
 * is out of scope for this UX-review prototype. See chat history for the full rationale.
 *
 * Important: we keep the results grid's `flyoutType="overlay"` (not `"push"`) -- `push`
 * pads `document.body` directly and reflows the *entire app page* behind everything,
 * which is not what we want. We stay on `overlay` and instead hide just the *second*
 * dark backdrop it would otherwise add on top of the main flyout's own one, via the
 * `~` sibling selector below (masks are portaled as direct children of `<body>` in
 * mount order, so this only ever touches the details flyout's mask, never the main
 * flyout's).
 */
const childFlyoutMockStyles = css`
  body > .euiOverlayMask ~ .euiOverlayMask {
    display: none !important;
  }

  ${detailsFlyoutSelector} {
    right: ${MAIN_FLYOUT_WIDTH}px !important;
    max-width: 460px !important;
    box-shadow: -6px 0 24px rgba(0, 0, 0, 0.24), 0 0 0 1px rgba(0, 0, 0, 0.08) !important;
  }
`;

export const CreateEditEsqlViewFlyoutV2: React.FunctionComponent<CreateEditEsqlViewFlyoutProps> = ({
  mode,
  initialView,
  initialQuery,
  manageViewsUrl,
  core,
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
    esql: initialView?.query ?? initialQuery ?? DEFAULT_QUERY,
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

      const successToastTitle =
        mode === 'create'
          ? i18n.translate('esqlViews.flyout.createSuccessToast', {
              defaultMessage: 'View "{name}" was created.',
              values: { name: finalName },
            })
          : i18n.translate('esqlViews.flyout.updateSuccessToast', {
              defaultMessage: 'View "{name}" was updated.',
              values: { name: finalName },
            });

      // The link is only wired up by callers outside Stack Management (e.g. Discover) that pass
      // both `manageViewsUrl` and `core` -- Stack Management's own list page is already the
      // destination the link would point to, so it omits both and gets the plain-string toast.
      if (manageViewsUrl && core) {
        notifications.toasts.addSuccess({
          title: successToastTitle,
          text: toMountPoint(
            <EuiLink href={manageViewsUrl} data-test-subj="esqlViewsManageViewsToastLink">
              <FormattedMessage
                id="esqlViews.flyout.manageViewsToastLink"
                defaultMessage="Manage ES|QL views"
              />
            </EuiLink>,
            core
          ),
        });
      } else {
        notifications.toasts.addSuccess(successToastTitle);
      }

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
  }, [
    core,
    description,
    esqlText,
    http,
    initialView,
    manageViewsUrl,
    mode,
    name,
    notifications,
    onClose,
    onSaved,
  ]);

  return (
    <>
      <Global styles={childFlyoutMockStyles} />
      <EuiFlyout
        onClose={onClose}
        size={MAIN_FLYOUT_WIDTH}
        ownFocus
        aria-labelledby={flyoutTitleId}
        data-test-subj={MAIN_FLYOUT_TEST_SUBJ}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={flyoutTitleId}>
              {mode === 'create'
                ? i18n.translate('esqlViews.flyout.createTitle', {
                    defaultMessage: 'Create ES|QL view',
                  })
                : i18n.translate('esqlViews.flyout.editTitle', {
                    defaultMessage: 'Edit ES|QL view',
                  })}
            </h2>
          </EuiTitle>
          {mode === 'edit' && (
            <>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <p>
                  {i18n.translate('esqlViews.flyout.editDescription', {
                    defaultMessage:
                      'Changes to this view apply wherever it is used, including dashboards, alerts, and other saved objects.',
                  })}
                </p>
              </EuiText>
            </>
          )}
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
    </>
  );
};
