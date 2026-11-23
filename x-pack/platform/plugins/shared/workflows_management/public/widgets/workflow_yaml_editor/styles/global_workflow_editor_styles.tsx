/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { Global } from '@emotion/react';
import React from 'react';
import { getBaseTypeIconsStyles } from './get_base_type_icons_styles';
import { getCodeActionWidgetStyles } from './get_code_action_widget_styles';
import { getMonacoWorkflowOverridesStyles } from './get_monaco_workflow_overrides_styles';
import { getProposedChangesStyles } from './get_proposed_changes_styles';

export const GlobalWorkflowEditorStyles = React.memo(function GlobalWorkflowEditorStyles() {
  const euiThemeContext = useEuiTheme();
  return (
    <Global
      styles={[
        getBaseTypeIconsStyles(euiThemeContext),
        getCodeActionWidgetStyles(euiThemeContext),
        getMonacoWorkflowOverridesStyles(euiThemeContext),
        getProposedChangesStyles(euiThemeContext),
      ]}
    />
  );
});
