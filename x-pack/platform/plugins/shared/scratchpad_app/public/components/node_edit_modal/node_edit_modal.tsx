/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiTextArea,
  EuiFieldText,
} from '@elastic/eui';
import type { ScratchpadNode } from '../../hooks/use_scratchpad_state';

interface NodeEditModalProps {
  node: ScratchpadNode | null;
  onClose: () => void;
  onSave: (nodeId: string, updates: Partial<ScratchpadNode>) => void;
}

export function NodeEditModal({ node, onClose, onSave }: NodeEditModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (node) {
      setTitle(String(node.data.title || ''));
      setContent(String(node.data.content || ''));
      setQuery(String(node.data.query || ''));
      setUrl(String(node.data.url || ''));
    }
  }, [node]);

  if (!node) {
    return null;
  }

  const handleSave = () => {
    const updates: Partial<ScratchpadNode> = {
      data: {
        ...node.data,
        ...(node.data.type === 'text_note' && { title, content }),
        ...(node.data.type === 'esql_query' && { query }),
        ...(node.data.type === 'kibana_link' && { url, title }),
      },
    };
    onSave(node.id, updates);
    onClose();
  };

  return (
    <EuiModal onClose={onClose} aria-label={`Edit ${node.data.type.replace('_', ' ')}`}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Edit {node.data.type.replace('_', ' ')}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm>
          {node.data.type === 'text_note' && (
            <>
              <EuiFormRow label="Title">
                <EuiFieldText value={title} onChange={(e) => setTitle(e.target.value)} />
              </EuiFormRow>
              <EuiFormRow label="Content">
                <EuiTextArea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                />
              </EuiFormRow>
            </>
          )}
          {node.data.type === 'esql_query' && (
            <EuiFormRow label="ESQL Query">
              <EuiTextArea value={query} onChange={(e) => setQuery(e.target.value)} rows={8} />
            </EuiFormRow>
          )}
          {node.data.type === 'kibana_link' && (
            <>
              <EuiFormRow label="Title">
                <EuiFieldText value={title} onChange={(e) => setTitle(e.target.value)} />
              </EuiFormRow>
              <EuiFormRow label="URL">
                <EuiFieldText value={url} onChange={(e) => setUrl(e.target.value)} fullWidth />
              </EuiFormRow>
            </>
          )}
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
        <EuiButton onClick={handleSave} fill>
          Save
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
