/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useEffect, useState } from 'react';
import { getFileByPath } from '../../data';

export function MarkdownDescription(props: { path: string }) {
  const [markdown, setMarkdown] = useState<string | null>(null);

  useEffect(() => {
    // I expect to get a path from props later
    getFileByPath(props.path).then(res => {
      setMarkdown(res);
    });
  }, []);
  return <Fragment>{markdown}</Fragment>;
}
