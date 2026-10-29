/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { ContentList, ContentListProvider } from '@kbn/content-list';
import { useContentListState } from '@kbn/content-list-provider';
import type { FieldDefinition } from '@kbn/content-list-provider';
import { DeleteImportModal } from '../../../components/imports/delete_import_modal';
import { isManagedImport } from '../../../components/imports/import_kind';
import { ImportSetupFlyout } from '../../../components/imports/import_setup_flyout';
import { useDeleteImport } from '../../../hooks/use_delete_import';
import { useSetImportEnabled } from '../../../hooks/use_set_import_enabled';
import { UserCapabilities } from '../../../services/user_capabilities';
import { IMPORT_STATUS_FILTER_ID, useImportsDataSource } from '../imports_data_source';
import type { ImportListItem } from '../imports_data_source';
import { ImportsEmptyState } from '../imports_empty_state';
import { ImportsListHeader } from '../imports_list_header';
import { IMPORT_STATUS_FILTER_OPTIONS, ImportsTableContent } from './imports_table_content';

const statusFieldDefinition: FieldDefinition = {
  fieldName: IMPORT_STATUS_FILTER_ID,
  resolveIdToDisplay: (id) =>
    IMPORT_STATUS_FILTER_OPTIONS.find((option) => option.key === id)?.label ?? id,
  resolveDisplayToId: (displayValue) =>
    IMPORT_STATUS_FILTER_OPTIONS.find((option) => option.label === displayValue)?.key,
  resolveFuzzyDisplayToIds: (partial) => {
    const lower = partial.toLowerCase();
    return IMPORT_STATUS_FILTER_OPTIONS.filter((option) =>
      option.label.toLowerCase().includes(lower)
    ).map((option) => option.key);
  },
};

const FEATURES_FIELDS: FieldDefinition[] = [statusFieldDefinition];

/**
 * Hands the list's `refetch` to the page. It has to sit directly under the provider, because
 * `ContentList` swaps its children for the empty state, so anything mounted in there is missing
 * while the list is empty, which is exactly when the first import gets created.
 */
const RefetchConnector = ({ onReady }: { onReady: (refetch: () => void) => void }) => {
  const { refetch } = useContentListState();
  useEffect(() => {
    onReady(refetch);
  }, [onReady, refetch]);
  return null;
};

export const ImportsTable = () => {
  const refetchRef = useRef<() => void>(() => {});
  const onRefetchReady = useCallback((refetch: () => void) => {
    refetchRef.current = refetch;
  }, []);

  const canWrite = useService(UserCapabilities).canWrite('rules');
  const dataSource = useImportsDataSource();
  const itemConfig = useMemo(() => ({}), []);

  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [importToDelete, setImportToDelete] = useState<ImportListItem | null>(null);

  const { mutate: setEnabled, isLoading: isChangingState, variables } = useSetImportEnabled();
  const { mutate: deleteImport, isLoading: isDeleting } = useDeleteImport();

  const openSetup = useCallback(() => setIsSetupOpen(true), []);

  const toggleEnabled = useCallback(
    (item: ImportListItem) =>
      setEnabled(
        { id: item.import.id, enabled: !item.import.enabled },
        { onSuccess: () => refetchRef.current() }
      ),
    [setEnabled]
  );

  return (
    <>
      <ContentListProvider
        id="imports"
        labels={{
          entity: i18n.translate('xpack.alertingV2.imports.entity', {
            defaultMessage: 'import',
          }),
          entityPlural: i18n.translate('xpack.alertingV2.imports.entityPlural', {
            defaultMessage: 'imports',
          }),
        }}
        dataSource={dataSource}
        item={itemConfig}
        features={{
          sorting: false,
          pagination: { initialPageSize: 20 },
          search: true,
          selection: false,
          fields: FEATURES_FIELDS,
        }}
      >
        <RefetchConnector onReady={onRefetchReady} />
        <ImportsListHeader canWrite={canWrite} onSetUp={openSetup} />
        <ContentList emptyState={<ImportsEmptyState canWrite={canWrite} onSetUp={openSetup} />}>
          <ImportsTableContent
            canWrite={canWrite}
            changingImportId={variables?.id}
            isChangingState={isChangingState}
            onToggleEnabled={toggleEnabled}
            onRequestDelete={setImportToDelete}
          />
        </ContentList>
      </ContentListProvider>

      {isSetupOpen && (
        <ImportSetupFlyout
          onClose={() => setIsSetupOpen(false)}
          onCreated={() => refetchRef.current()}
        />
      )}

      {importToDelete && (
        <DeleteImportModal
          importName={importToDelete.import.name}
          isManaged={isManagedImport(importToDelete.import)}
          isLoading={isDeleting}
          onCancel={() => setImportToDelete(null)}
          onConfirm={(deleteResources) =>
            deleteImport(
              { id: importToDelete.import.id, deleteResources },
              {
                onSuccess: () => {
                  setImportToDelete(null);
                  refetchRef.current();
                },
                onSettled: () => setImportToDelete(null),
              }
            )
          }
        />
      )}
    </>
  );
};
