/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState, Fragment } from 'react';
import { EuiLoadingContent, EuiText } from '@elastic/eui';
import ReactMarkdown from 'react-markdown';
import { getFileByPath } from '../../data';
import { markdownRenderers } from './markdown_renderers';

export function Readme({ readmePath }: { readmePath: string }) {
  const [markdown, setMarkdown] = useState<string | undefined>(undefined);

  useEffect(() => {
    getFileByPath(readmePath).then(res => {
      setMarkdown(res);
    });
  }, []);

  return (
    <Fragment>
      {markdown ? (
        <ReactMarkdown renderers={markdownRenderers} source={markdown} />
      ) : (
        <EuiText>
          {/* simulates a long page of text loading */}
          <p>
            <EuiLoadingContent lines={5} />
          </p>
          <p>
            <EuiLoadingContent lines={6} />
          </p>
          <p>
            <EuiLoadingContent lines={4} />
          </p>
        </EuiText>
      )}
    </Fragment>
  );
}
