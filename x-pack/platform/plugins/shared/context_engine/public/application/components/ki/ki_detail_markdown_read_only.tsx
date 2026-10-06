/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiMarkdownFormat } from '@elastic/eui';
import React from 'react';
import { useKiDetailContentPanelStyles } from './use_ki_detail_content_panel_styles';

interface KiDetailMarkdownReadOnlyProps {
  content: string;
}

export const KiDetailMarkdownReadOnly = ({ content }: KiDetailMarkdownReadOnlyProps) => {
  const panelStyles = useKiDetailContentPanelStyles();

  return (
    <div css={[panelStyles.shell, panelStyles.shellFill]} data-test-subj="contextKiDetailContent">
      <div css={panelStyles.body}>
        <div data-test-subj="contextKiDetailMarkdownRendered">
          <EuiMarkdownFormat textSize="s">{content}</EuiMarkdownFormat>
        </div>
      </div>
    </div>
  );
};
