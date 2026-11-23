/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { parse as parseYaml } from 'yaml';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { Owner } from '../../../../common/bundled-types.gen';
import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import { FieldSchema, isInlineField } from '../../../../common/types/domain/template/fields';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { INVESTIGATIONS_OWNER } from '../../../../common/investigations/constants';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import { FieldDefinitionFlyout } from '../../../components/field_library/components/field_definition_flyout';
import { GlobalFieldDefinitionsList } from '../../../components/field_library/components/global_field_definitions_list';
import { useCreateFieldDefinition } from '../../../components/field_library/hooks/use_create_field_definition';
import { useDeleteFieldDefinition } from '../../../components/field_library/hooks/use_delete_field_definition';
import { useGetFieldDefinitions } from '../../../components/field_library/hooks/use_get_field_definitions';
import { useReorderGlobalFieldDefinitions } from '../../../components/field_library/hooks/use_reorder_global_field_definitions';
import { useUpdateFieldDefinition } from '../../../components/field_library/hooks/use_update_field_definition';
import * as fieldLibraryI18n from '../../../components/field_library/translations';
import { useRefreshInvestigationTemplates } from '../../hooks';
import { ICONS } from '../../icons';
import { ConfirmModal, EmptyState, ErrorState, LoadingState } from '../shared';
import * as i18n from './translations';

/** The label and validation flags live in the definition YAML; malformed ones still get a row. */
const parseInlineField = (definition: string): InlineField | undefined => {
  try {
    const result = FieldSchema.safeParse(parseYaml(definition));
    return result.success && isInlineField(result.data) ? result.data : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The global fields of the owner, managed in the Cases field library with the Cases components:
 * a global field is a field definition with `isGlobal`, and it applies to every investigation.
 * Creating, editing, deleting and reordering go through the same Cases hooks as the Cases field
 * library page.
 */
export const GlobalFieldsSection: React.FC = () => {
  const { permissions } = useCasesContext();
  const refreshTypes = useRefreshInvestigationTemplates();
  const canManage = permissions.manageTemplates;

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [editing, setEditing] = useState<FieldDefinition | undefined>();
  const [deleting, setDeleting] = useState<FieldDefinition | undefined>();

  const query = useGetFieldDefinitions({ owner: INVESTIGATIONS_OWNER, isGlobal: true });
  const { mutate: createFieldDefinition, isLoading: isCreating } = useCreateFieldDefinition({
    onSuccess: () => {
      setIsFlyoutOpen(false);
      void refreshTypes();
    },
  });
  const { mutate: updateFieldDefinition, isLoading: isUpdating } = useUpdateFieldDefinition({
    onSuccess: () => {
      setIsFlyoutOpen(false);
      setEditing(undefined);
      void refreshTypes();
    },
  });
  const { mutate: deleteFieldDefinition, isLoading: isDeleting } = useDeleteFieldDefinition({
    onSuccess: () => {
      setDeleting(undefined);
      void refreshTypes();
    },
  });
  const {
    mutate: reorder,
    isLoading: isReordering,
    isError: hasReorderFailed,
  } = useReorderGlobalFieldDefinitions();

  // The list shows the fields in the order Cases gives them on a case.
  const definitions = useMemo(
    () =>
      (query.data?.fieldDefinitions ?? [])
        .map((definition, index) => ({
          definition,
          index,
          order: definition.displayOrder ?? index,
        }))
        .filter(({ definition }) => definition.isGlobal === true)
        .sort((a, b) => a.order - b.order || a.index - b.index)
        .map(({ definition }) => definition),
    [query.data]
  );

  const openCreate = useCallback(() => {
    setEditing(undefined);
    setIsFlyoutOpen(true);
  }, []);
  const openEdit = useCallback((definition: FieldDefinition) => {
    setEditing(definition);
    setIsFlyoutOpen(true);
  }, []);
  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
    setEditing(undefined);
  }, []);

  const save = useCallback(
    ({
      name,
      description,
      definition,
    }: {
      name: string;
      description: string;
      definition: string;
      isGlobal: boolean;
    }) => {
      const owner = INVESTIGATIONS_OWNER as Owner;
      if (editing) {
        updateFieldDefinition({
          id: editing.fieldDefinitionId,
          fieldDefinition: {
            name,
            description,
            definition,
            owner,
            isGlobal: true,
            displayOrder: editing.displayOrder,
          },
        });
        return;
      }
      createFieldDefinition({
        fieldDefinition: {
          name,
          description,
          definition,
          owner,
          isGlobal: true,
        },
      });
    },
    [createFieldDefinition, editing, updateFieldDefinition]
  );

  const reorderFields = useCallback(
    (reordered: FieldDefinition[]) =>
      reorder(reordered.map((definition, index) => ({ ...definition, displayOrder: index }))),
    [reorder]
  );

  const renderBody = () => {
    if (query.isLoading) {
      return <LoadingState label={i18n.GLOBAL_FIELDS_LOADING} />;
    }
    if (query.isError) {
      return (
        <ErrorState
          title={i18n.GLOBAL_FIELDS_LOAD_ERROR}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      );
    }
    if (definitions.length === 0) {
      return (
        <EmptyState
          iconType={ICONS.template}
          title={i18n.GLOBAL_FIELDS_EMPTY_TITLE}
          body={i18n.GLOBAL_FIELDS_EMPTY_BODY}
          actions={
            canManage ? (
              <EuiButton
                fill
                iconType={ICONS.add}
                onClick={openCreate}
                data-test-subj="investigationGlobalFieldsEmptyCreate"
              >
                {fieldLibraryI18n.CREATE_FIELD_DEFINITION}
              </EuiButton>
            ) : undefined
          }
          data-test-subj="investigationGlobalFieldsEmpty"
        />
      );
    }
    return (
      <GlobalFieldDefinitionsList
        fieldDefinitions={definitions}
        parseInlineField={parseInlineField}
        onReorder={reorderFields}
        onEdit={openEdit}
        onDelete={setDeleting}
        onCreateFieldDefinition={openCreate}
        hasReorderFailed={hasReorderFailed}
      />
    );
  };

  return (
    <section data-test-subj="investigationGlobalFieldsSection">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false} wrap>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>{fieldLibraryI18n.GLOBAL_FIELDS_SECTION_TITLE}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiNotificationBadge color="subdued" data-test-subj="investigationGlobalFieldsCount">
                {definitions.length}
              </EuiNotificationBadge>
            </EuiFlexItem>
            {isReordering ? (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="s" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {fieldLibraryI18n.SAVING_FIELD_ORDER}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          <EuiText size="s" color="subdued">
            <p>{i18n.GLOBAL_FIELDS_DESCRIPTION}</p>
          </EuiText>
        </EuiFlexItem>
        {canManage && definitions.length > 0 ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType={ICONS.add}
              onClick={openCreate}
              data-test-subj="investigationGlobalFieldsCreate"
            >
              {fieldLibraryI18n.CREATE_FIELD_DEFINITION}
            </EuiButton>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {canManage ? null : (
        <>
          <EuiCallOut
            announceOnMount={false}
            size="s"
            iconType={ICONS.lock}
            title={i18n.GLOBAL_FIELDS_NO_PERMISSION}
            data-test-subj="investigationGlobalFieldsReadOnly"
          />
          <EuiSpacer size="m" />
        </>
      )}
      {renderBody()}
      {isFlyoutOpen && canManage ? (
        <FieldDefinitionFlyout
          owner={INVESTIGATIONS_OWNER}
          fieldDefinition={editing}
          onSave={save}
          onClose={closeFlyout}
          isSaving={isCreating || isUpdating}
          isGlobalOnly
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title={fieldLibraryI18n.DELETE_CONFIRM_TITLE}
          body={<p>{fieldLibraryI18n.DELETE_CONFIRM_BODY(deleting.name)}</p>}
          confirmLabel={fieldLibraryI18n.DELETE_FIELD_DEFINITION}
          cancelLabel={fieldLibraryI18n.CANCEL}
          destructive
          isLoading={isDeleting}
          onConfirm={() => deleteFieldDefinition({ id: deleting.fieldDefinitionId })}
          onCancel={() => setDeleting(undefined)}
          data-test-subj="investigationGlobalFieldDeleteModal"
        />
      ) : null}
    </section>
  );
};
GlobalFieldsSection.displayName = 'GlobalFieldsSection';
