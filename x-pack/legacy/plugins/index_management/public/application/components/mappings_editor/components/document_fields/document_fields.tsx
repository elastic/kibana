/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo, useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { useMappingsState, useDispatch } from '../../mappings_state';
import { deNormalize } from '../../lib';
import { EditFieldContainer } from './fields';
import { DocumentFieldsHeader } from './document_fields_header';
import { DocumentFieldsJsonEditor } from './fields_json_editor';
import { DocumentFieldsTreeEditor } from './fields_tree_editor';
import { SearchResult } from './search_fields';

export const DocumentFields = React.memo(() => {
  const { fields, search, documentFields } = useMappingsState();
  const dispatch = useDispatch();

  const { status, fieldToEdit, editor: editorType } = documentFields;

  const jsonEditorDefaultValue = useMemo(() => {
    if (editorType === 'json') {
      return deNormalize(fields);
    }
  }, [editorType]);

  const editor =
    editorType === 'json' ? (
      <DocumentFieldsJsonEditor defaultValue={jsonEditorDefaultValue!} />
    ) : (
      <DocumentFieldsTreeEditor />
    );

  const renderEditField = () => {
    if (status !== 'editingField') {
      return null;
    }
    const field = fields.byId[fieldToEdit!];
    return <EditFieldContainer field={field} allFields={fields.byId} />;
  };

  const onSearchChange = useCallback((value: string) => {
    dispatch({ type: 'search:update', value });
  }, []);

  const searchTerm = search.term.trim();

  return (
    <div data-test-subj="documentFields">
      <DocumentFieldsHeader searchValue={search.term} onSearchChange={onSearchChange} />
      <EuiSpacer size="m" />
      {searchTerm !== '' ? (
        <SearchResult result={search.result} documentFieldsState={documentFields} />
      ) : (
        editor
      )}
      {renderEditField()}
    </div>
  );
});
