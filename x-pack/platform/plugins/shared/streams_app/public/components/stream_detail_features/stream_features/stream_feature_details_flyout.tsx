/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
} from '@elastic/eui';
import { type Streams, type Feature, isFeatureWithFilter } from '@kbn/streams-schema';
import { Condition } from '@kbn/streamlang';
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
  feature: Feature;
  definition: Streams.all.Definition;
  closeFlyout: () => void;
  refreshFeatures: () => void;
}) => {
  const [featureDescription, setFeatureDescription] = React.useState(feature.description);
  const { upsertQuery } = useStreamFeaturesApi(definition);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [featureFilter, setFeatureFilter] = React.useState<Condition | undefined>(feature.filter);
  const [isEditingCondition, toggleIsEditingCondition] = useToggle(false);

  const updateFeature = () => {
    setIsUpdating(true);
    upsertQuery(feature, {
      description: featureDescription,
      filter: featureFilter,
    }).finally(() => {
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
          <h2>{feature.name}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <div>
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
            value={featureDescription}
            onChange={setFeatureDescription}
            height={400}
            readOnly={false}
            initialViewMode="viewing"
          />
          <EuiSpacer size="m" />
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
            {featureFilter && (
              <EditableConditionPanel
                condition={featureFilter}
                isEditingCondition={isEditingCondition}
                setCondition={setFeatureFilter}
              />
            )}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          {isFeatureWithFilter(feature) && <FeatureEventsData feature={feature} />}
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
            >
              <FormattedMessage
                id="xpack.streams.featureDetails.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton isLoading={isUpdating} onClick={updateFeature} fill>
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
