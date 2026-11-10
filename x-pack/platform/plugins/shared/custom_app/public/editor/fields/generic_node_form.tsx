/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { type AppDocument, type AppNode, updateNode } from '@kbn/custom-app-common';
import { Section } from './section';
import { TextAreaField } from './fields';

type Props = Record<string, unknown>;

/** What a node is made of, but for what the editor itself keeps: its id, its type and what it holds. */
const propsOf = (node: AppNode): Props => {
  const { id, type, children, ...props } = node as AppNode & { children?: unknown };
  return props;
};

const isObject = (value: unknown): value is Props =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

interface GenericNodeFormProps {
  node: AppNode;
  onEdit: (change: (document: AppDocument) => AppDocument, coalesceKey?: string) => void;
}

/**
 * The form of a component that has none of its own: what it is made of, as JSON. A component type
 * needs only its schema and its renderer to exist; this is how it is changed in the editor until
 * it has a form worth writing. What is written is checked as the rest of the document is, and what
 * is wrong with it is reported against the component.
 */
export const GenericNodeForm = ({ node, onEdit }: GenericNodeFormProps) => {
  const current = JSON.stringify(propsOf(node), null, 2);
  const [text, setText] = useState(current);
  const [error, setError] = useState<string>();
  // What this form last wrote, so that a change from elsewhere, such as an undo, is told apart.
  const written = useRef(current);

  useEffect(() => {
    if (current !== written.current) {
      written.current = current;
      setText(current);
      setError(undefined);
    }
  }, [current]);

  const change = (next: string) => {
    setText(next);

    let parsed: unknown;
    try {
      parsed = JSON.parse(next);
    } catch (e) {
      setError(
        i18n.translate('xpack.customApp.editor.genericNotJson', {
          defaultMessage: 'This is not valid JSON yet.',
        })
      );
      return;
    }
    if (!isObject(parsed)) {
      setError(
        i18n.translate('xpack.customApp.editor.genericNotObject', {
          defaultMessage: 'This needs to be an object, in curly braces.',
        })
      );
      return;
    }

    setError(undefined);
    written.current = JSON.stringify(parsed, null, 2);
    // What was taken out is taken out, and not kept as it was.
    const removed = Object.fromEntries(
      Object.keys(propsOf(node))
        .filter((key) => !(key in parsed))
        .map((key) => [key, undefined])
    );
    onEdit((document) => {
      const result = updateNode(document, node.id, { ...removed, ...parsed } as never);
      return result.ok ? result.document : document;
    }, `generic:${node.id}`);
  };

  return (
    <Section
      title={i18n.translate('xpack.customApp.editor.sectionGeneric', {
        defaultMessage: 'Settings',
      })}
      description={i18n.translate('xpack.customApp.editor.genericDescription', {
        defaultMessage:
          'This component has no form yet, so its settings are written as JSON. Anything that is wrong is reported above.',
      })}
    >
      <TextAreaField
        label={i18n.translate('xpack.customApp.editor.genericLabel', {
          defaultMessage: 'Settings as JSON',
        })}
        value={text}
        rows={14}
        error={error}
        onChange={change}
      />
    </Section>
  );
};
