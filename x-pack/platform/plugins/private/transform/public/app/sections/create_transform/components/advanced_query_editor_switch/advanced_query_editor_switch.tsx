/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiSwitch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { SwitchModal } from '../switch_modal';
import { defaultSearch } from '../step_define';

import type { StepDefineFormHook } from '../step_define';

export const AdvancedQueryEditorSwitch: FC<StepDefineFormHook> = ({
  advancedSourceEditor: {
    actions: {
      setAdvancedSourceEditorSwitchModalVisible,
      setSourceConfigUpdated,
      toggleAdvancedSourceEditor,
    },
    state: {
      isAdvancedSourceEditorEnabled,
      isAdvancedSourceEditorSwitchModalVisible,
      sourceConfigUpdated,
      advancedEditorSourceConfigLastApplied,
      advancedEditorSourceConfig,
    },
  },
  searchBar: {
    actions: { setSearchQuery },
  },
}) => {
  // If switching to KQL after updating via editor - reset search
  const toggleEditorHandler = (reset = false) => {
    if (reset === true) {
      setSearchQuery(defaultSearch);
      setSourceConfigUpdated(false);
    }
    toggleAdvancedSourceEditor(reset);
  };

  return (
    <>
      <EuiSwitch
        label={i18n.translate(
          'xpack.transform.stepDefineForm.advancedEditorSourceConfigSwitchLabel',
          {
            defaultMessage: 'Edit JSON query',
          }
        )}
        checked={isAdvancedSourceEditorEnabled}
        onChange={() => {
          if (
            isAdvancedSourceEditorEnabled &&
            (sourceConfigUpdated ||
              advancedEditorSourceConfig !== advancedEditorSourceConfigLastApplied)
          ) {
            setAdvancedSourceEditorSwitchModalVisible(true);
            return;
          }

          toggleEditorHandler();
        }}
        data-test-subj="transformAdvancedQueryEditorSwitch"
      />
      {isAdvancedSourceEditorSwitchModalVisible && (
        <SwitchModal
          onCancel={() => setAdvancedSourceEditorSwitchModalVisible(false)}
          onConfirm={() => {
            setAdvancedSourceEditorSwitchModalVisible(false);
            toggleEditorHandler(true);
          }}
          type={'source'}
        />
      )}
    </>
  );
};
