/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiMarkdownEditor,
  EuiTitle,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiHorizontalRule,
} from '@elastic/eui';
import type { Condition } from '@kbn/streamlang';
import { type System } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import useToggle from 'react-use/lib/useToggle';
import { EditableConditionPanel } from '../../data_management/shared';

export const SystemDetailExpanded = ({
  system,
  setSystems,
}: {
  system: System;
  setSystems: React.Dispatch<React.SetStateAction<System[]>>;
}) => {
  const [isEditingCondition, toggleIsEditingCondition] = useToggle(false);

  const setSystem = (updated: System) => {
    setSystems((prev) => prev.map((s) => (s.name === updated.name ? updated : s)));
  };

  const handleConditionChange = (newFilter: Condition) => {
    setSystem({ ...system, filter: newFilter });
  };

  const handleDescriptionChange = (newDescription: string) => {
    setSystem({ ...system, description: newDescription });
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" css={{ padding: '24px 24px 0 0' }}>
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.streams.streamDetailView.systemDetailExpanded.description', {
            defaultMessage: 'Description',
          })}
        </h3>
      </EuiTitle>
      <EuiMarkdownEditor
        aria-label={i18n.translate(
          'xpack.streams.streamDetailView.systemDetailExpanded.markdownEditorAriaLabel',
          {
            defaultMessage: 'System description markdown editor',
          }
        )}
        value={system.description}
        onChange={handleDescriptionChange}
        readOnly={false}
        initialViewMode="viewing"
        height={320}
        autoExpandPreview={false}
      />
      <EuiHorizontalRule />
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexGroup justifyContent="flexStart" gutterSize="xs" alignItems="center">
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.streams.streamDetailView.systemDetailExpanded.filter', {
                defaultMessage: 'Filter',
              })}
            </h3>
          </EuiTitle>
          <EuiButtonIcon
            iconType="pencil"
            onClick={toggleIsEditingCondition}
            aria-label={i18n.translate(
              'xpack.streams.streamDetailView.systemDetailExpanded.filter.edit',
              {
                defaultMessage: 'Edit filter',
              }
            )}
            data-test-subj={
              isEditingCondition
                ? 'system_identification_edit_filter_button'
                : 'system_identification_save_filter_button'
            }
          />
        </EuiFlexGroup>
        <EditableConditionPanel
          condition={system.filter}
          isEditingCondition={isEditingCondition}
          setCondition={handleConditionChange}
        />
        <EuiHorizontalRule />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
