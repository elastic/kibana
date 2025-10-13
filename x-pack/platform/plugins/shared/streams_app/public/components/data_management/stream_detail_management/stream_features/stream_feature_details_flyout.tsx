/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiMarkdownEditor,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { Streams, Feature } from '@kbn/streams-schema';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useStreamFeatures } from '../../../stream_detail_significant_events_view/add_significant_event_flyout/common/use_stream_features';
import { ConditionPanel } from '../../shared';
import { FeatureEventsData } from './feature_events_data';
import { useStreamFeaturesApi } from '../../../../hooks/use_stream_features_api';

export const StreamFeatureDetailsFlyout = ({
  feature: initialFeature,
  definition,
  closeFlyout,
  featureName,
}: {
  featureName?: string;
  feature?: Feature;
  closeFlyout: () => void;
  definition: Streams.all.Definition;
}) => {
  const [feature, setFeature] = React.useState<Feature | undefined>(initialFeature);
  const [value, setValue] = React.useState(initialFeature?.description ?? '');
  const { upsertQuery } = useStreamFeaturesApi(definition);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const { value: listOfFeatures } = useStreamFeatures(definition);

  useEffect(() => {
    if (featureName && !feature) {
      const foundFeature = listOfFeatures?.features.find((s) => s.name === featureName);
      setFeature(foundFeature);
      setValue(foundFeature?.description ?? '');
    } else {
      setFeature(initialFeature);
    }
  }, [definition.name, listOfFeatures, initialFeature, featureName, feature]);

  if (!feature && !featureName) {
    return null;
  }

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
          <h2>{feature?.name ?? 'Feature details'}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
      </EuiFlyoutHeader>
      {feature ? (
        <>
          <EuiFlyoutBody>
            <div>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate(
                    'xpack.streams.streamDetailView.featureDetailExpanded.description',
                    {
                      defaultMessage: 'Description',
                    }
                  )}
                </h3>
              </EuiTitle>
              <EuiMarkdownEditor
                aria-label={i18n.translate(
                  'xpack.streams.streamDetailView.featureDetailExpanded.markdownEditorAriaLabel',
                  {
                    defaultMessage: 'Feature description markdown editor',
                  }
                )}
                value={value}
                onChange={setValue}
                height={400}
                readOnly={false}
                initialViewMode="viewing"
              />
              <EuiSpacer size="m" />
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate('xpack.streams.streamDetailView.featureDetailExpanded.filter', {
                    defaultMessage: 'Filter',
                  })}
                </h3>
              </EuiTitle>
              <ConditionPanel condition={feature.filter} />
              <EuiSpacer size="m" />
              <FeatureEventsData feature={feature} />
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
                <EuiButton
                  isLoading={isUpdating}
                  onClick={() => {
                    setIsUpdating(true);
                    upsertQuery(feature.name, {
                      description: value,
                      filter: feature.filter,
                    }).finally(() => {
                      setIsUpdating(false);
                      closeFlyout();
                    });
                  }}
                  fill
                >
                  <FormattedMessage
                    id="xpack.streams.featureDetails.saveChanges"
                    defaultMessage="Save changes"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </>
      ) : (
        <EuiLoadingSpinner size="xl" />
      )}
    </EuiFlyout>
  );
};
