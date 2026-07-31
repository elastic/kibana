/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { parse as parseYaml } from 'yaml';
import type { Owner } from '../../../../common/bundled-types.gen';
import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import { FieldSchema, isRefField } from '../../../../common/types/domain/template/fields';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useCasesTemplatesNavigation } from '../../../common/navigation';
import { useGetFieldDefinitions } from '../hooks/use_get_field_definitions';
import { useCreateFieldDefinition } from '../hooks/use_create_field_definition';
import { useUpdateFieldDefinition } from '../hooks/use_update_field_definition';
import { useDeleteFieldDefinition } from '../hooks/use_delete_field_definition';
import { useReorderGlobalFieldDefinitions } from '../hooks/use_reorder_global_field_definitions';
import { FieldDefinitionFlyout } from '../components/field_definition_flyout';
import * as i18n from '../translations';
import * as templatesI18n from '../../templates_v2/translations';
import { CasesAppHeader } from '../../app/cases_app_header';
import { CasesPageBody } from '../../app/cases_page_body';

export type AllFieldDefinitionsPageProps = Record<string, never>;

/**
 * The field library table stores each field's `label` and validation flags inside its `definition`
 * YAML (a single FieldSchema entry), not as top-level attributes. Parse the inline field out for
 * the Label and Required columns, tolerating malformed/legacy definitions (and `$ref` entries,
 * which carry neither) by returning `undefined` so the row still renders.
 */
const parseInlineFieldDefinition = (definition: string): InlineField | undefined => {
  try {
    const result = FieldSchema.safeParse(parseYaml(definition));
    if (!result.success || isRefField(result.data)) {
      return undefined;
    }
    return result.data;
  } catch {
    return undefined;
  }
};

export const AllFieldDefinitionsPage: React.FC<AllFieldDefinitionsPageProps> = () => {
  const { owner } = useCasesContext();
  const { getCasesTemplatesUrl, navigateToCasesTemplates } = useCasesTemplatesNavigation();

  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [editingFieldDef, setEditingFieldDef] = useState<FieldDefinition | undefined>(undefined);
  const [deletingFieldDef, setDeletingFieldDef] = useState<FieldDefinition | undefined>(undefined);

  const { data, isLoading } = useGetFieldDefinitions({ owner });
  const { mutate: createFieldDef, isLoading: isCreating } = useCreateFieldDefinition({
    onSuccess: () => setFlyoutOpen(false),
  });
  const { mutate: updateFieldDef, isLoading: isUpdating } = useUpdateFieldDefinition({
    onSuccess: () => {
      setFlyoutOpen(false);
      setEditingFieldDef(undefined);
    },
  });
  const { mutate: deleteFieldDef } = useDeleteFieldDefinition({
    onSuccess: () => setDeletingFieldDef(undefined),
  });
  const { mutate: reorderGlobalFieldDefinitions, isLoading: isReorderingGlobalFieldDefinitions } =
    useReorderGlobalFieldDefinitions();

  const fieldDefinitions = useMemo(() => data?.fieldDefinitions ?? [], [data?.fieldDefinitions]);
  const globalFieldDefinitions = useMemo(
    () =>
      fieldDefinitions
        .map((fieldDefinition, index) => ({
          fieldDefinition,
          index,
          displayOrder: fieldDefinition.displayOrder ?? index,
        }))
        .filter(({ fieldDefinition }) => fieldDefinition.isGlobal === true)
        .sort((a, b) => a.displayOrder - b.displayOrder || a.index - b.index)
        .map(({ fieldDefinition }) => fieldDefinition),
    [fieldDefinitions]
  );
  const tableFieldDefinitions = useMemo(
    () => [
      ...globalFieldDefinitions,
      ...fieldDefinitions.filter((fieldDefinition) => fieldDefinition.isGlobal !== true),
    ],
    [fieldDefinitions, globalFieldDefinitions]
  );

  const handleCreate = useCallback(() => {
    setEditingFieldDef(undefined);
    setFlyoutOpen(true);
  }, []);

  const handleEdit = useCallback((fd: FieldDefinition) => {
    setEditingFieldDef(fd);
    setFlyoutOpen(true);
  }, []);

  const handleSave = useCallback(
    ({
      name,
      description,
      definition,
      isGlobal,
    }: {
      name: string;
      description: string;
      definition: string;
      isGlobal: boolean;
    }) => {
      const ownerValue = (Array.isArray(owner) ? owner[0] : owner) as Owner;

      if (editingFieldDef) {
        updateFieldDef({
          id: editingFieldDef.fieldDefinitionId,
          fieldDefinition: {
            name,
            description,
            definition,
            owner: ownerValue,
            isGlobal,
            displayOrder: editingFieldDef.displayOrder,
          },
        });
      } else {
        createFieldDef({
          fieldDefinition: { name, description, definition, owner: ownerValue, isGlobal },
        });
      }
    },
    [editingFieldDef, createFieldDef, updateFieldDef, owner]
  );

  const handleDelete = useCallback((fd: FieldDefinition) => {
    setDeletingFieldDef(fd);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deletingFieldDef) {
      deleteFieldDef({ id: deletingFieldDef.fieldDefinitionId });
    }
  }, [deletingFieldDef, deleteFieldDef]);

  const handleMoveGlobalField = useCallback(
    (fieldDefinitionId: string, direction: 'up' | 'down') => {
      const currentIndex = globalFieldDefinitions.findIndex(
        ({ fieldDefinitionId: id }) => id === fieldDefinitionId
      );
      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= globalFieldDefinitions.length) {
        return;
      }

      const reorderedGlobalFieldDefinitions = [...globalFieldDefinitions];
      [reorderedGlobalFieldDefinitions[currentIndex], reorderedGlobalFieldDefinitions[nextIndex]] =
        [reorderedGlobalFieldDefinitions[nextIndex], reorderedGlobalFieldDefinitions[currentIndex]];

      reorderGlobalFieldDefinitions(
        reorderedGlobalFieldDefinitions.map((fieldDefinition, index) => ({
          ...fieldDefinition,
          displayOrder: index,
        }))
      );
    },
    [globalFieldDefinitions, reorderGlobalFieldDefinitions]
  );

  const columns: Array<EuiBasicTableColumn<FieldDefinition>> = [
    {
      field: 'name',
      name: i18n.NAME_COLUMN,
      sortable: true,
      truncateText: true,
      'data-test-subj': 'fieldDefinitionNameCell',
    },
    {
      name: i18n.LABEL_COLUMN,
      truncateText: true,
      'data-test-subj': 'fieldDefinitionLabelCell',
      render: (fd: FieldDefinition) => {
        const label = parseInlineFieldDefinition(fd.definition)?.label;
        return (
          <EuiText size="s" color={label ? 'default' : 'subdued'}>
            {label ?? '—'}
          </EuiText>
        );
      },
    },
    {
      field: 'description',
      name: i18n.DESCRIPTION_COLUMN,
      render: (description: string | undefined) => (
        <EuiText size="s" color="subdued">
          {description ?? '—'}
        </EuiText>
      ),
    },
    {
      name: i18n.REQUIRED_COLUMN,
      'data-test-subj': 'fieldDefinitionRequiredCell',
      render: (fd: FieldDefinition) => {
        const validation = parseInlineFieldDefinition(fd.definition)?.validation;
        const isRequired = validation?.required === true;
        const isRequiredOnClose = validation?.required_on_close === true;
        if (!isRequired && !isRequiredOnClose) {
          return (
            <EuiText size="s" color="subdued">
              {'—'}
            </EuiText>
          );
        }
        return (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {isRequired && (
              <EuiFlexItem grow={false}>
                <EuiBadge data-test-subj="fieldDefinitionRequiredBadge">
                  {i18n.REQUIRED_BADGE}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {isRequiredOnClose && (
              <EuiFlexItem grow={false}>
                <EuiBadge data-test-subj="fieldDefinitionRequiredOnCloseBadge">
                  {i18n.REQUIRED_ON_CLOSE_BADGE}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'isGlobal',
      name: i18n.APPLY_TO_ALL_CASES_COLUMN,
      render: (value: boolean | undefined) =>
        value ? i18n.GLOBAL_FIELD_YES : i18n.GLOBAL_FIELD_NO,
      'data-test-subj': 'fieldDefinitionApplyToAllCasesCell',
    },
    {
      name: i18n.ACTIONS_COLUMN,
      actions: [
        {
          render: (fd: FieldDefinition) => {
            const globalFieldIndex = globalFieldDefinitions.findIndex(
              ({ fieldDefinitionId }) => fieldDefinitionId === fd.fieldDefinitionId
            );
            const canMoveGlobalField = fd.isGlobal === true && globalFieldIndex >= 0;

            return (
              <EuiFlexGroup gutterSize="xs" responsive={false}>
                {canMoveGlobalField ? (
                  <>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip content={i18n.MOVE_GLOBAL_FIELD_UP} disableScreenReaderOutput>
                        <EuiButtonIcon
                          iconType="sortUp"
                          aria-label={i18n.MOVE_GLOBAL_FIELD_UP}
                          onClick={() => handleMoveGlobalField(fd.fieldDefinitionId, 'up')}
                          disabled={isReorderingGlobalFieldDefinitions || globalFieldIndex === 0}
                          data-test-subj="fieldDefinitionMoveUpButton"
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip content={i18n.MOVE_GLOBAL_FIELD_DOWN} disableScreenReaderOutput>
                        <EuiButtonIcon
                          iconType="sortDown"
                          aria-label={i18n.MOVE_GLOBAL_FIELD_DOWN}
                          onClick={() => handleMoveGlobalField(fd.fieldDefinitionId, 'down')}
                          disabled={
                            isReorderingGlobalFieldDefinitions ||
                            globalFieldIndex === globalFieldDefinitions.length - 1
                          }
                          data-test-subj="fieldDefinitionMoveDownButton"
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  </>
                ) : null}
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={i18n.EDIT_FIELD_DEFINITION} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="pencil"
                      aria-label={i18n.EDIT_FIELD_DEFINITION}
                      onClick={() => handleEdit(fd)}
                      data-test-subj="fieldDefinitionEditButton"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={i18n.DELETE_FIELD_DEFINITION} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="trash"
                      aria-label={i18n.DELETE_FIELD_DEFINITION}
                      color="danger"
                      onClick={() => handleDelete(fd)}
                      data-test-subj="fieldDefinitionDeleteButton"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          },
        },
      ],
    },
  ];

  const fieldLibraryMenu = useMemo(
    () => ({
      primaryActionItem: {
        id: 'createFieldDefinition',
        label: i18n.CREATE_FIELD_DEFINITION,
        iconType: 'plusInCircle' as const,
        run: () => handleCreate(),
        testId: 'createFieldDefinitionButton',
      },
    }),
    [handleCreate]
  );

  const fieldLibraryBack = useMemo(
    () => ({
      href: getCasesTemplatesUrl(),
      // `AppHeader` renders this as "Back to {label}", so pass just the destination name.
      label: templatesI18n.TEMPLATE_TITLE,
      // AppHeader's back button keeps its `href` on the rendered anchor, so the default
      // navigation must be prevented here to avoid a full page reload alongside the SPA one.
      onClick: (event: React.MouseEvent) => {
        event.preventDefault();
        navigateToCasesTemplates();
      },
    }),
    [getCasesTemplatesUrl, navigateToCasesTemplates]
  );

  return (
    <>
      <CasesAppHeader
        title={i18n.FIELD_LIBRARY_TITLE}
        back={fieldLibraryBack}
        menu={fieldLibraryMenu}
      />
      <CasesPageBody>
        <EuiText size="s" color="subdued">
          <p>{i18n.FIELD_LIBRARY_DESCRIPTION}</p>
        </EuiText>
        <EuiSpacer size="l" />
        {isLoading ? (
          <EuiSkeletonText lines={5} />
        ) : (
          <EuiBasicTable
            items={tableFieldDefinitions}
            tableCaption={i18n.FIELD_DEFINITIONS_TABLE_CAPTION}
            rowHeader="name"
            columns={columns}
            data-test-subj="fieldDefinitionsTable"
          />
        )}

        {flyoutOpen && (
          <FieldDefinitionFlyout
            owner={Array.isArray(owner) ? owner[0] : owner}
            fieldDefinition={editingFieldDef}
            onSave={handleSave}
            onClose={() => {
              setFlyoutOpen(false);
              setEditingFieldDef(undefined);
            }}
            isSaving={isCreating || isUpdating}
          />
        )}

        {deletingFieldDef && (
          <EuiConfirmModal
            title={i18n.DELETE_CONFIRM_TITLE}
            onCancel={() => setDeletingFieldDef(undefined)}
            onConfirm={handleConfirmDelete}
            cancelButtonText={i18n.CANCEL}
            confirmButtonText={i18n.DELETE_FIELD_DEFINITION}
            buttonColor="danger"
            data-test-subj="fieldDefinitionDeleteConfirmModal"
          >
            <p>{i18n.DELETE_CONFIRM_BODY(deletingFieldDef.name)}</p>
          </EuiConfirmModal>
        )}
      </CasesPageBody>
    </>
  );
};

AllFieldDefinitionsPage.displayName = 'AllFieldDefinitionsPage';

// eslint-disable-next-line import/no-default-export
export default AllFieldDefinitionsPage;
