/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiMarkdownEditor, EuiTitle, EuiSpacer, EuiFlexGroup, EuiButtonIcon } from '@elastic/eui';
import type { Condition } from '@kbn/streamlang';
import { isFeatureWithFilter, type Feature } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import useToggle from 'react-use/lib/useToggle';
import { EditableConditionPanel } from '../../data_management/shared';

export const FeatureDetailExpanded = ({
  feature,
  setFeatures,
}: {
  feature: Feature;
  setFeatures: React.Dispatch<React.SetStateAction<Feature[]>>;
}) => {
  const [isEditingCondition, toggleIsEditingCondition] = useToggle(false);

  const setFeature = (updated: Feature) => {
    setFeatures((prev) => prev.map((s) => (s.name === updated.name ? updated : s)));
  };

  const handleConditionChange = (newFilter: Condition) => {
    setFeature({ ...feature, filter: newFilter });
  };

  const handleDescriptionChange = (newDescription: string) => {
    setFeature({ ...feature, description: newDescription });
  };

  return (
    <EuiFlexGroup direction="column">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.streams.streamDetailView.featureDetailExpanded.description', {
            defaultMessage: 'Description',
          })}
        </h3>
      </EuiTitle>
      <EuiMarkdownEditor
        aria-label={i18n.translate(
          'xpack.streams.streamDetailView.featureDetailExpanded.markdownEditorAriaLabel',
          {
            defaultMessage: 'Feature description markdown editor',
          }
        )}
        value={feature.description}
        onChange={handleDescriptionChange}
        height={400}
        readOnly={false}
        initialViewMode="viewing"
      />

      <EuiSpacer size="m" />

      {isFeatureWithFilter(feature) && (
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexGroup justifyContent="flexStart" gutterSize="xs" alignItems="center">
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.streams.streamDetailView.featureDetailExpanded.filter', {
                  defaultMessage: 'Filter',
                })}
              </h3>
            </EuiTitle>
            <EuiButtonIcon
              iconType="pencil"
              onClick={toggleIsEditingCondition}
              aria-label={i18n.translate(
                'xpack.streams.streamDetailView.featureDetailExpanded.filter.edit',
                {
                  defaultMessage: 'Edit filter',
                }
              )}
            />
          </EuiFlexGroup>
          <EditableConditionPanel
            condition={feature.filter}
            isEditingCondition={isEditingCondition}
            setCondition={handleConditionChange}
          />
        </EuiFlexGroup>
      )}
    </EuiFlexGroup>
  );
};
