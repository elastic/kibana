/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { getFileByPath } from '../../data';
import { markdownRenderers } from './markdown_renderers';

export function Readme({ readmePath }: { readmePath: string }) {
  const [markdown, setMarkdown] = useState<string>('');

  useEffect(() => {
    getFileByPath(readmePath).then(res => {
      setMarkdown(res);
    });
  }, []);

  return <ReactMarkdown renderers={markdownRenderers} source={markdown} />;
}
