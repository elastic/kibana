/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiConfirmModal,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
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
import { GlobalFieldDefinitionsList } from '../components/global_field_definitions_list';
import { FieldDefinitionRowList } from '../components/field_definition_row_list';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [editingFieldDef, setEditingFieldDef] = useState<FieldDefinition | undefined>(undefined);
  const [deletingFieldDef, setDeletingFieldDef] = useState<FieldDefinition | undefined>(undefined);
  const confirmModalTitleId = useGeneratedHtmlId();

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
  const {
    mutate: reorderGlobalFieldDefinitions,
    isLoading: isReorderingGlobalFieldDefinitions,
    isError: hasReorderFailed,
  } = useReorderGlobalFieldDefinitions();

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
  // Only global fields carry an order, so they are the only ones presented in an orderable surface.
  // Keeping both kinds in a single table forced order controls onto rows that had no order, which
  // is what left the actions column ragged and the ordering itself unexplained.
  const templateFieldDefinitions = useMemo(
    () => fieldDefinitions.filter((fieldDefinition) => fieldDefinition.isGlobal !== true),
    [fieldDefinitions]
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

  // A drag can cross several positions at once, so the whole resulting order is persisted in one
  // request. The previous per-swap write meant moving a field from last to first cost one round
  // trip per row it passed.
  const handleReorderGlobalFields = useCallback(
    (reordered: FieldDefinition[]) => {
      reorderGlobalFieldDefinitions(
        reordered.map((fieldDefinition, index) => ({ ...fieldDefinition, displayOrder: index }))
      );
    },
    [reorderGlobalFieldDefinitions]
  );

  // One search box filters the whole library rather than one group, so a field can be found
  // without the user first having to know which group it lives in.
  const matchesSearch = useCallback(
    (fieldDefinition: FieldDefinition) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) {
        return true;
      }
      const label = parseInlineFieldDefinition(fieldDefinition.definition)?.label ?? '';
      return [fieldDefinition.name, label, fieldDefinition.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query);
    },
    [searchQuery]
  );

  const visibleGlobalFieldDefinitions = useMemo(
    () => globalFieldDefinitions.filter(matchesSearch),
    [globalFieldDefinitions, matchesSearch]
  );
  const visibleTemplateFieldDefinitions = useMemo(
    () => templateFieldDefinitions.filter(matchesSearch),
    [templateFieldDefinitions, matchesSearch]
  );

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
          // One list, two labelled groups — not two panels. Both groups hold the same kind of
          // thing, and splitting them into separate bordered cards made the page read as two
          // unrelated tools with the reusable fields tucked into the lesser one.
          <EuiPanel hasBorder paddingSize="l" data-test-subj="fieldDefinitionsList">
            <EuiFieldSearch
              fullWidth
              incremental
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={i18n.SEARCH_FIELD_DEFINITIONS}
              aria-label={i18n.SEARCH_FIELD_DEFINITIONS}
              data-test-subj="fieldDefinitionsSearch"
            />
            <EuiSpacer size="l" />

            <section data-test-subj="globalFieldDefinitionsSection">
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xxs">
                    <h2>{i18n.GLOBAL_FIELDS_SECTION_TITLE}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiNotificationBadge color="subdued">
                    {visibleGlobalFieldDefinitions.length}
                  </EuiNotificationBadge>
                </EuiFlexItem>
                {isReorderingGlobalFieldDefinitions ? (
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiLoadingSpinner size="s" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          {i18n.SAVING_FIELD_ORDER}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
              {/* States the rule and the gesture up front, so neither the ordering nor the drag
                  handle has to be inferred from the rows. */}
              <EuiText size="xs" color="subdued">
                <p>{i18n.GLOBAL_FIELDS_SECTION_DESCRIPTION}</p>
              </EuiText>
              <EuiSpacer size="s" />
              {searchQuery.trim() ? (
                // Dragging a filtered list would persist an order the user cannot see, so search
                // switches the ordered group to a plain list and says why.
                <>
                  <EuiText size="xs" color="subdued">
                    <p>
                      <em>{i18n.REORDER_DISABLED_WHILE_SEARCHING}</em>
                    </p>
                  </EuiText>
                  <EuiSpacer size="s" />
                  <FieldDefinitionRowList
                    fieldDefinitions={visibleGlobalFieldDefinitions}
                    parseInlineField={parseInlineFieldDefinition}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    emptyMessage={i18n.NO_MATCHING_FIELD_DEFINITIONS}
                    dataTestSubj="globalFieldDefinitionsFiltered"
                  />
                </>
              ) : (
                <GlobalFieldDefinitionsList
                  fieldDefinitions={globalFieldDefinitions}
                  parseInlineField={parseInlineFieldDefinition}
                  onReorder={handleReorderGlobalFields}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCreateFieldDefinition={handleCreate}
                  hasReorderFailed={hasReorderFailed}
                />
              )}
            </section>

            <EuiSpacer size="xl" />

            <section data-test-subj="templateFieldDefinitionsSection">
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xxs">
                    <h2>{i18n.TEMPLATE_FIELDS_SECTION_TITLE}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiNotificationBadge color="subdued">
                    {visibleTemplateFieldDefinitions.length}
                  </EuiNotificationBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiText size="xs" color="subdued">
                <p>{i18n.TEMPLATE_FIELDS_SECTION_DESCRIPTION}</p>
              </EuiText>
              <EuiSpacer size="s" />
              <FieldDefinitionRowList
                fieldDefinitions={visibleTemplateFieldDefinitions}
                parseInlineField={parseInlineFieldDefinition}
                onEdit={handleEdit}
                onDelete={handleDelete}
                emptyMessage={
                  searchQuery.trim() ? (
                    i18n.NO_MATCHING_FIELD_DEFINITIONS
                  ) : (
                    <FormattedMessage
                      id="xpack.cases.fieldLibrary.templateFieldsSectionEmpty"
                      defaultMessage="No reusable fields yet. {createFieldDefinitionLink} to add fields to your templates."
                      values={{
                        createFieldDefinitionLink: (
                          <EuiLink
                            onClick={handleCreate}
                            data-test-subj="templateFieldDefinitionsEmptyCreateLink"
                          >
                            {i18n.TEMPLATE_FIELDS_SECTION_EMPTY_LINK}
                          </EuiLink>
                        ),
                      }}
                    />
                  )
                }
                dataTestSubj="fieldDefinitionsTable"
              />
            </section>
          </EuiPanel>
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
            aria-labelledby={confirmModalTitleId}
            title={i18n.DELETE_CONFIRM_TITLE}
            titleProps={{ id: confirmModalTitleId }}
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
