/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller } from 'react-hook-form';
import { ToolsSelection } from '../tools_selection';

interface ToolsTabProps {
  control: any;
  tools: any[];
  isLoading: boolean;
  isFormDisabled: boolean;
}

export const ToolsTab: React.FC<ToolsTabProps> = ({
  control,
  tools,
  isLoading,
  isFormDisabled,
}) => {
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  return (
    <>
      <EuiSpacer size="l" />
      <EuiTitle size="m">
        <h4>
          {i18n.translate('xpack.onechat.agents.form.toolsSelectionTitle', {
            defaultMessage: 'Configure Agent Tools',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="l" />
      <Controller
        name="configuration.tools"
        control={control}
        render={({ field }) => (
          <ToolsSelection
            tools={tools}
            toolsLoading={isLoading}
            selectedTools={field.value}
            onToolsChange={field.onChange}
            disabled={isFormDisabled}
            enableSearch={true}
            enableFiltering={true}
            enableGrouping={true}
            showActiveOnly={showActiveOnly}
            onShowActiveOnlyChange={setShowActiveOnly}
          />
        )}
      />
    </>
  );
};
