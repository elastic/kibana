/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSection,
  EuiSelect,
  EuiSpacer,
  EuiText,
  type EuiBasicTableColumn,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { ListEvaluatorsResponse } from '@kbn/evals-common';
import { useDeleteEvaluator, useEvaluators } from '../../hooks/use_evaluators_api';
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';
import { getErrorMessage } from '../../utils/get_error_message';
import { EvaluatorEditorFlyout } from './evaluator_editor_flyout';
import * as i18n from './translations';

type EvaluatorSummary = ListEvaluatorsResponse['evaluators'][number];

interface EditorState {
  mode: 'create' | 'edit';
  evaluatorName?: string;
}

const requiredKeys = (schema?: Record<string, unknown>): string[] =>
  Array.isArray(schema?.required)
    ? schema.required.filter((value): value is string => typeof value === 'string')
    : [];

const kindLabel = (kind: EvaluatorSummary['kind']): string =>
  kind === 'llm' ? i18n.LLM_KIND : i18n.CODE_KIND;

const originLabel = (origin: EvaluatorSummary['origin']): string =>
  origin === 'built_in' ? i18n.BUILT_IN_ORIGIN : i18n.USER_DEFINED_ORIGIN;

const EvaluatorInputs: React.FC<{ evaluator: EvaluatorSummary }> = ({ evaluator }) => {
  const evidence = requiredKeys(evaluator.evidence_schema);
  const referenceData = requiredKeys(evaluator.reference_data_schema);
  if (evidence.length === 0 && referenceData.length === 0) {
    return <>{i18n.NO_INPUTS}</>;
  }

  return (
    <EuiText size="xs">
      {evidence.length > 0 ? <div>{i18n.EVIDENCE_INPUTS(evidence.join(', '))}</div> : null}
      {referenceData.length > 0 ? (
        <div>{i18n.REFERENCE_INPUTS(referenceData.join(', '))}</div>
      ) : null}
    </EuiText>
  );
};

export const EvaluatorsPage: React.FC = () => {
  const deleteModalTitleId = useGeneratedHtmlId();
  const { euiTheme } = useEuiTheme();
  const { canManage } = useEvalsPermissions();
  const { data, isLoading, error, refetch } = useEvaluators();
  const deleteEvaluator = useDeleteEvaluator();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<'all' | EvaluatorSummary['kind']>('all');
  const [origin, setOrigin] = useState<'all' | EvaluatorSummary['origin']>('all');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EvaluatorSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const evaluators = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (data?.evaluators ?? []).filter((evaluator) => {
      const matchesSearch =
        !normalizedSearch ||
        evaluator.name.toLowerCase().includes(normalizedSearch) ||
        evaluator.description.toLowerCase().includes(normalizedSearch);
      return (
        matchesSearch &&
        (kind === 'all' || evaluator.kind === kind) &&
        (origin === 'all' || evaluator.origin === origin)
      );
    });
  }, [data?.evaluators, kind, origin, search]);

  const columns = useMemo<Array<EuiBasicTableColumn<EvaluatorSummary>>>(() => {
    const result: Array<EuiBasicTableColumn<EvaluatorSummary>> = [
      {
        field: 'name',
        name: i18n.COLUMN_NAME,
        render: (name: string) => <strong>{name}</strong>,
      },
      { field: 'description', name: i18n.COLUMN_DESCRIPTION },
      {
        field: 'kind',
        name: i18n.COLUMN_KIND,
        width: '120px',
        render: (value: EvaluatorSummary['kind']) => <EuiBadge>{kindLabel(value)}</EuiBadge>,
      },
      {
        field: 'origin',
        name: i18n.COLUMN_ORIGIN,
        width: '120px',
        render: (value: EvaluatorSummary['origin']) => <EuiBadge>{originLabel(value)}</EuiBadge>,
      },
      { field: 'version', name: i18n.COLUMN_VERSION, width: '100px' },
      {
        name: i18n.COLUMN_INPUTS,
        render: (evaluator: EvaluatorSummary) => <EvaluatorInputs evaluator={evaluator} />,
      },
    ];

    if (canManage) {
      result.push({
        name: i18n.COLUMN_ACTIONS,
        width: '90px',
        actions: [
          {
            name: i18n.EDIT_FLYOUT_TITLE,
            description: i18n.EDIT_FLYOUT_TITLE,
            icon: 'pencil',
            type: 'icon',
            available: (evaluator) => evaluator.origin === 'user_defined',
            onClick: (evaluator) => setEditor({ mode: 'edit', evaluatorName: evaluator.name }),
            'data-test-subj': 'evalsEvaluatorEdit',
          },
          {
            name: i18n.DELETE_BUTTON,
            description: i18n.DELETE_BUTTON,
            icon: 'trash',
            color: 'danger',
            type: 'icon',
            available: (evaluator) => evaluator.origin === 'user_defined',
            onClick: (evaluator) => setPendingDelete(evaluator),
            'data-test-subj': 'evalsEvaluatorDelete',
          },
        ],
      });
    }
    return result;
  }, [canManage]);

  const onDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    setActionError(null);
    try {
      await deleteEvaluator.mutateAsync(pendingDelete.name);
      setPendingDelete(null);
    } catch (deleteError) {
      setActionError(getErrorMessage(deleteError));
      setPendingDelete(null);
    }
  };

  return (
    <>
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiFlexGroup
          responsive={false}
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="m"
        >
          <EuiFlexItem>
            <EuiFlexGroup responsive={false} alignItems="center" gutterSize="m">
              <EuiFlexItem css={{ maxWidth: 500 }}>
                <EuiFieldSearch
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={i18n.SEARCH_PLACEHOLDER}
                  fullWidth
                  data-test-subj="evalsEvaluatorSearch"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={{ width: 180 }}>
                <EuiSelect
                  value={kind}
                  onChange={(event) => setKind(event.target.value as typeof kind)}
                  options={[
                    { value: 'all', text: i18n.ALL_KINDS },
                    { value: 'llm', text: i18n.LLM_KIND },
                    { value: 'code', text: i18n.CODE_KIND },
                  ]}
                  aria-label={i18n.COLUMN_KIND}
                  data-test-subj="evalsEvaluatorKindFilter"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={{ width: 180 }}>
                <EuiSelect
                  value={origin}
                  onChange={(event) => setOrigin(event.target.value as typeof origin)}
                  options={[
                    { value: 'all', text: i18n.ALL_ORIGINS },
                    { value: 'built_in', text: i18n.BUILT_IN_ORIGIN },
                    { value: 'user_defined', text: i18n.USER_DEFINED_ORIGIN },
                  ]}
                  aria-label={i18n.COLUMN_ORIGIN}
                  data-test-subj="evalsEvaluatorOriginFilter"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {canManage ? (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                iconType="plusCircle"
                onClick={() => setEditor({ mode: 'create' })}
                data-test-subj="evalsEvaluatorCreate"
              >
                {i18n.CREATE_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        <EuiSpacer size="m" />

        {actionError ? (
          <>
            <EuiCallOut announceOnMount color="danger" iconType="warning" title={actionError} />
            <EuiSpacer size="m" />
          </>
        ) : null}

        {error ? (
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="warning"
            title={i18n.LOAD_ERROR_TITLE}
          >
            <p>{getErrorMessage(error)}</p>
            <EuiButton color="danger" onClick={() => refetch()}>
              {i18n.RETRY_BUTTON}
            </EuiButton>
          </EuiCallOut>
        ) : (
          <>
            {!isLoading && evaluators.length === 0 ? (
              <EuiEmptyPrompt
                iconType="search"
                title={<h2>{i18n.NO_RESULTS_TITLE}</h2>}
                body={<p>{i18n.NO_RESULTS_DESCRIPTION}</p>}
              />
            ) : (
              <EuiBasicTable
                tableCaption={i18n.TABLE_CAPTION}
                items={evaluators}
                columns={columns}
                loading={isLoading}
                rowHeader="name"
                data-test-subj="evalsEvaluatorsTable"
              />
            )}
          </>
        )}
      </EuiPageSection>

      {editor ? (
        <EvaluatorEditorFlyout
          mode={editor.mode}
          evaluatorName={editor.evaluatorName}
          onClose={() => setEditor(null)}
        />
      ) : null}

      {pendingDelete ? (
        <EuiConfirmModal
          aria-labelledby={deleteModalTitleId}
          title={i18n.DELETE_TITLE}
          titleProps={{ id: deleteModalTitleId }}
          onCancel={() => setPendingDelete(null)}
          onConfirm={onDelete}
          cancelButtonText={i18n.CANCEL_BUTTON}
          confirmButtonText={i18n.DELETE_BUTTON}
          buttonColor="danger"
          isLoading={deleteEvaluator.isLoading}
        >
          <p>{i18n.DELETE_DESCRIPTION(pendingDelete.name)}</p>
        </EuiConfirmModal>
      ) : null}
    </>
  );
};
