/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBasicTable,
  type EuiBasicTableColumn,
  EuiButton,
  EuiButtonEmpty,
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
import { Global, css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AggregateQuery } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { ESQLLangEditor } from '@kbn/esql/public';
import type { CreateEditEsqlViewFlyoutProps } from './create_edit_view_flyout';
import { slugifyViewName } from './services/name_utils';
import { fetchView, upsertView } from './services/views_client';
import { setLocalViewMetadata } from './services/local_metadata';
import { runMockQueryPreview, type MockQueryPreviewResult } from './services/mock_query_preview';

const DEFAULT_QUERY = 'FROM kibana_sample_data_ecommerce | WHERE KQL("term")';

/**
 * EUI ships a real managed-flyout session mechanism internally (`EuiFlyoutMain` +
 * `EuiFlyoutChild`), but it isn't reachable from Kibana plugins: Kibana bundles a single shared
 * copy of `@elastic/eui` (see `kbn-ui-shared-deps-npm`) so every plugin's React tree shares one
 * Context/store, but that aliasing only covers the exact `@elastic/eui` specifier, not deep
 * subpaths -- and even that shared copy doesn't export these APIs at all (verified via
 * `require('@elastic/eui').EuiFlyoutMain === undefined`). A deep import pulls in a *second*,
 * private copy of the module (its own `createContext()`/store), which can never see the
 * provider mounted by `KibanaEuiProvider` at the app root, and throws
 * "EuiManagedFlyout must be used within an EuiFlyoutManager" as soon as it renders.
 *
 * So, like V2's "ES|QL Query Results" details flyout (see `create_edit_view_flyout_v2.tsx`),
 * this docks a second, independent `EuiFlyout` flush against this one using global CSS with
 * `!important`, rather than plain `style`/`ownFocus` props: `EuiFlyout`'s own styles set the
 * anchor edge via the *logical* `inset-inline-end` property (not the physical `right`), and its
 * named `size`s resolve to viewport-relative percentages -- both are internal implementation
 * details of `EuiFlyoutComponent`'s memoized style computation that plain props can't reliably
 * out-cascade or predict the pixel value of. `!important` on both the logical and physical
 * property names sidesteps that ambiguity entirely, matching V2's already-proven technique.
 */
const MAIN_FLYOUT_TEST_SUBJ = 'esqlViewsCreateEditFlyout';
const RESULTS_FLYOUT_TEST_SUBJ = 'esqlViewsResultsFlyout';
// Doubled attribute selectors bump specificity so these reliably win regardless of stylesheet
// insertion order (see V2's identical rationale for its details-flyout selector).
const mainFlyoutSelector = `[data-test-subj="${MAIN_FLYOUT_TEST_SUBJ}"][data-test-subj="${MAIN_FLYOUT_TEST_SUBJ}"]`;
const resultsFlyoutSelector = `[data-test-subj="${RESULTS_FLYOUT_TEST_SUBJ}"][data-test-subj="${RESULTS_FLYOUT_TEST_SUBJ}"]`;

// Pinning both flyouts' widths to literal pixel values (rather than named sizes, which resolve
// to viewport-relative percentages) means both always agree on the same numbers below, with no
// runtime measuring needed. 460px approximated V2's own child flyout; 768px instead matches
// `size="m"`'s own `max-width` (`euiTheme.breakpoint.m`, see `flyout.styles.js`), since the
// results flyout below is semantically `size="m"`.
const MAIN_FLYOUT_WIDTH = 600;
const RESULTS_FLYOUT_WIDTH = 768;

const dockedResultsFlyoutStyles = css`
  ${mainFlyoutSelector} {
    inset-inline-end: 0 !important;
    right: 0 !important;
    width: ${MAIN_FLYOUT_WIDTH}px !important;
    max-width: ${MAIN_FLYOUT_WIDTH}px !important;
  }

  ${resultsFlyoutSelector} {
    inset-inline-end: ${MAIN_FLYOUT_WIDTH}px !important;
    right: ${MAIN_FLYOUT_WIDTH}px !important;
    width: ${RESULTS_FLYOUT_WIDTH}px !important;
    max-width: ${RESULTS_FLYOUT_WIDTH}px !important;
    box-shadow: -6px 0 24px rgba(0, 0, 0, 0.24), 0 0 0 1px rgba(0, 0, 0, 0.08) !important;
  }
`;

type ResultsTableRow = Record<string, unknown>;

const buildResultsTableColumns = (
  columns: MockQueryPreviewResult['columns']
): Array<EuiBasicTableColumn<ResultsTableRow>> =>
  columns.map((column) => ({
    field: column.id,
    name: column.name,
    render:
      column.meta.type === 'date'
        ? (value: unknown) =>
            typeof value === 'string' ? value.replace('T', ' ').replace('Z', '') : String(value)
        : undefined,
  }));

const buildResultsTableItems = (
  columns: MockQueryPreviewResult['columns'],
  rows: MockQueryPreviewResult['rows']
): ResultsTableRow[] =>
  rows.map((row) => Object.fromEntries(columns.map((column, index) => [column.id, row[index]])));

export const CreateEditEsqlViewFlyoutV3: React.FunctionComponent<CreateEditEsqlViewFlyoutProps> = ({
  mode,
  initialView,
  http,
  data,
  notifications,
  onClose,
  onSaved,
}) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'esqlViewsFlyoutTitle' });
  const resultsFlyoutTitleId = useGeneratedHtmlId({ prefix: 'esqlViewsResultsFlyoutTitle' });

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
  const [isResultsFlyoutOpen, setIsResultsFlyoutOpen] = useState(false);

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
        // Unlike V1/V2's accordion (which always collapsed on a fresh run), leave the results
        // flyout's open/closed state untouched -- if it's already open, it just refreshes in
        // place with the new results.
        setPreviewResult(result);
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

  const flyoutTitle =
    mode === 'create'
      ? i18n.translate('esqlViews.flyout.createTitle', { defaultMessage: 'Create ES|QL view' })
      : i18n.translate('esqlViews.flyout.editTitle', { defaultMessage: 'Edit ES|QL view' });

  return (
    <>
      <Global styles={dockedResultsFlyoutStyles} />
      <EuiFlyout
        onClose={onClose}
        size={MAIN_FLYOUT_WIDTH}
        ownFocus
        aria-labelledby={flyoutTitleId}
        data-test-subj={MAIN_FLYOUT_TEST_SUBJ}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={flyoutTitleId}>{flyoutTitle}</h2>
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
          <EuiButton
            size="s"
            color="text"
            iconType="tableDensityNormal"
            isDisabled={!previewResult}
            onClick={() => setIsResultsFlyoutOpen(true)}
            data-test-subj="esqlViewsPreviewResultsButton"
          >
            {i18n.translate('esqlViews.flyout.previewResultsButtonLabel', {
              defaultMessage: 'Preview results',
            })}
            {previewResult ? (
              <>
                {' '}
                <EuiNotificationBadge size="m" color="subdued">
                  {previewResult.rows.length}
                </EuiNotificationBadge>
              </>
            ) : null}
          </EuiButton>
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
      {isResultsFlyoutOpen && previewResult ? (
        <EuiFlyout
          onClose={() => setIsResultsFlyoutOpen(false)}
          size="m"
          // No backdrop of its own -- the main flyout above already has one, and a second
          // overlapping mask would just darken the page twice. Positioning/width are forced via
          // `dockedResultsFlyoutStyles` above instead of props (see the comment on that const).
          ownFocus={false}
          aria-labelledby={resultsFlyoutTitleId}
          data-test-subj={RESULTS_FLYOUT_TEST_SUBJ}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id={resultsFlyoutTitleId}>
                {i18n.translate('esqlViews.flyout.previewResultsFlyoutTitle', {
                  defaultMessage: 'Preview query results',
                })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('esqlViews.flyout.previewResultsCount', {
                  defaultMessage: 'Results ({count, plural, one {# row} other {# rows}})',
                  values: { count: previewResult.rows.length },
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiBasicTable
              columns={buildResultsTableColumns(previewResult.columns)}
              items={buildResultsTableItems(previewResult.columns, previewResult.rows)}
              data-test-subj="esqlViewsResultsTable"
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}
    </>
  );
};
