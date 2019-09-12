/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { GraphState, GraphDispatch, selectedFieldsSelector } from '../../state_management';
import { GraphFieldManager } from '../graph_field_manager';
import { EmptyOverlay } from './empty_overlay';
import { UnconfiguredOverlay } from './unconfigured_overlay';

export interface GraphChromeProps {
  state: GraphState;
  dispatch: GraphDispatch;
  onFillWorkspace: () => void;
  hasNodes: boolean;
}

export function GraphChrome(props: GraphChromeProps) {
  const { onFillWorkspace, hasNodes, ...fieldManagerProps } = props;
  const [pickerOpen, setPickerOpen] = useState(false);
  const hasSelectedFields = selectedFieldsSelector(props.state).length > 0;

  return (
    <I18nProvider>
      <GraphFieldManager
        pickerOpen={pickerOpen}
        setPickerOpen={setPickerOpen}
        {...fieldManagerProps}
      />
      {!hasSelectedFields && (
        <UnconfiguredOverlay
          onSelectFieldsClicked={() => {
            setPickerOpen(true);
          }}
        />
      )}
      {hasSelectedFields && !hasNodes && <EmptyOverlay onFillWorkspace={onFillWorkspace} />}
    </I18nProvider>
  );
}
