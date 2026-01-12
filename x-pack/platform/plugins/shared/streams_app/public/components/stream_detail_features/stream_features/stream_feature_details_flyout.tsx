/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { cloneDeep, isEqual } from 'lodash';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiMarkdownEditor,
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import { type Streams, type System } from '@kbn/streams-schema';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import useToggle from 'react-use/lib/useToggle';
import { EditableConditionPanel } from '../../data_management/shared';
import { FeatureEventsData } from './feature_events_data';
import { useStreamFeaturesApi } from '../../../hooks/use_stream_features_api';

export const StreamFeatureDetailsFlyout = ({
  feature,
  definition,
  closeFlyout,
  refreshFeatures,
}: {
  feature: System;
  definition: Streams.all.Definition;
  closeFlyout: () => void;
  refreshFeatures: () => void;
}) => {
  const [updatedFeature, setUpdatedFeature] = React.useState<System>(cloneDeep(feature));
  const { upsertSystem } = useStreamFeaturesApi(definition);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isEditingCondition, toggleIsEditingCondition] = useToggle(false);

  const updateFeature = () => {
    setIsUpdating(true);
    upsertSystem(updatedFeature).finally(() => {
      setIsUpdating(false);
      refreshFeatures();
      closeFlyout();
    });
  };

  return (
    <EuiFlyout
      ownFocus
      onClose={closeFlyout}
      hideCloseButton
      aria-label={i18n.translate('xpack.streams.featureDetails.flyoutAriaLabel', {
        defaultMessage: 'Feature details',
      })}
      size="m"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{updatedFeature.name}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div>
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.streams.streamDetailView.featureDetailExpanded.description', {
                defaultMessage: 'Description',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiMarkdownEditor
            aria-label={i18n.translate(
              'xpack.streams.streamDetailView.featureDetailExpanded.markdownEditorAriaLabel',
              {
                defaultMessage: 'Feature description markdown editor',
              }
            )}
            value={updatedFeature.description}
            onChange={(value) => setUpdatedFeature({ ...updatedFeature, description: value })}
            height={320}
            readOnly={false}
            initialViewMode="viewing"
            autoExpandPreview={false}
          />
          <EuiHorizontalRule />
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexGroup justifyContent="flexStart" gutterSize="xs" alignItems="center">
              <EuiTitle size="xxs">
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
                data-test-subj={
                  isEditingCondition
                    ? 'feature_identification_existing_edit_filter_button'
                    : 'feature_identification_existing_save_filter_button'
                }
              />
            </EuiFlexGroup>
            <EditableConditionPanel
              condition={updatedFeature.filter}
              isEditingCondition={isEditingCondition}
              setCondition={(condition) =>
                setUpdatedFeature({ ...updatedFeature, filter: condition })
              }
            />
          </EuiFlexGroup>
          <EuiHorizontalRule />
          <FeatureEventsData feature={updatedFeature} definition={definition} />
        </div>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              isLoading={isUpdating}
              iconType="cross"
              onClick={closeFlyout}
              flush="left"
              aria-label={i18n.translate('xpack.streams.featureDetails.closeButtonAriaLabel', {
                defaultMessage: 'Close flyout',
              })}
              data-test-subj="feature_identification_existing_cancel_edit_button"
            >
              <FormattedMessage
                id="xpack.streams.featureDetails.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              isLoading={isUpdating}
              onClick={updateFeature}
              fill
              isDisabled={isEqual(feature, updatedFeature)}
              data-test-subj="feature_identification_existing_save_changes_button"
            >
              <FormattedMessage
                id="xpack.streams.featureDetails.saveChanges"
                defaultMessage="Save changes"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
