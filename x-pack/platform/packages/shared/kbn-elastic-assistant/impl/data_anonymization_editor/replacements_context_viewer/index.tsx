/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiMarkdownFormat } from '@elastic/eui';
import { Replacements } from '@kbn/elastic-assistant-common';
import React from 'react';

export interface Props {
  markdown: string;
  replacements: Replacements;
}

const ReplacementsContextViewerComponent: React.FC<Props> = ({ markdown, replacements }) => {
  const markdownWithOriginalValues = Object.keys(replacements).reduce<string>(
    (acc, uuid) => acc.replaceAll(uuid, replacements[uuid]),
    markdown
  );

  return (
    <div data-test-subj="replacementsContextViewer">
      <EuiMarkdownFormat>{markdownWithOriginalValues}</EuiMarkdownFormat>
    </div>
  );
};

ReplacementsContextViewerComponent.displayName = 'ReplacementsContextViewer';

export const ReplacementsContextViewer = React.memo(ReplacementsContextViewerComponent);
