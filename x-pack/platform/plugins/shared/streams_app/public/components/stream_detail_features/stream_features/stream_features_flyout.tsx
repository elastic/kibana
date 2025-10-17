/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiLoadingElastic,
} from '@elastic/eui';
import type { Streams, Feature } from '@kbn/streams-schema';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { useWaitingForAiMessage } from '../../../hooks/use_waiting_for_ai_message';
import { useStreamFeaturesApi } from '../../../hooks/use_stream_features_api';
import { StreamFeaturesTable } from './stream_features_table';

export const StreamFeaturesFlyout = ({
  features,
  closeFlyout,
  isLoading,
  definition,
  setFeatures,
}: {
  isLoading: boolean;
  features: Feature[];
  closeFlyout: () => void;
  definition: Streams.all.Definition;
  setFeatures: React.Dispatch<React.SetStateAction<Feature[]>>;
}) => {
  const [selectedFeatureNames, setSelectedFeatureNames] = useState<Set<string>>(new Set());
  const { addFeaturesToStream } = useStreamFeaturesApi(definition);
  const [isUpdating, setIsUpdating] = useState(false);

  const selectedFeatures = useMemo(
    () => features.filter((f) => selectedFeatureNames.has(f.name)),
    [features, selectedFeatureNames]
  );

  return (
    <EuiFlyout
      ownFocus
      onClose={closeFlyout}
      hideCloseButton
      aria-label={i18n.translate('xpack.streams.streamFeaturesFlyout.flyoutAriaLabel', {
        defaultMessage: 'Stream description',
      })}
      size="l"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.streams.streamFeaturesFlyout.title"
              defaultMessage="Feature identification"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        className={css`
          & .euiFlyoutBody__overflowContent {
            height: 100%;
          }
        `}
      >
        {!isLoading ? (
          <StreamFeaturesTable
            features={features}
            selectedFeatureNames={selectedFeatureNames}
            setSelectedFeatureNames={setSelectedFeatureNames}
            definition={definition}
            setFeatures={setFeatures}
          />
        ) : (
          <LoadingState closeFlyout={closeFlyout} />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              isLoading={isUpdating}
              onClick={closeFlyout}
              flush="left"
              aria-label={i18n.translate(
                'xpack.streams.streamFeaturesFlyout.closeButtonAriaLabel',
                {
                  defaultMessage: 'Close flyout',
                }
              )}
            >
              <FormattedMessage
                id="xpack.streams.streamFeaturesFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              isLoading={isUpdating}
              onClick={() => {
                setIsUpdating(true);
                addFeaturesToStream(selectedFeatures).finally(() => {
                  closeFlyout();
                  setIsUpdating(false);
                });
              }}
              fill
              isDisabled={selectedFeatureNames.size === 0}
            >
              <FormattedMessage
                id="xpack.streams.streamFeaturesFlyout.addToStreamButton"
                defaultMessage="Add to stream"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

function LoadingState({ closeFlyout }: { closeFlyout: () => void }) {
  const label = useWaitingForAiMessage();

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      justifyContent="center"
      css={{ height: '100%' }}
      gutterSize="m"
    >
      <EuiFlexItem grow={false} css={{ textAlign: 'center' }}>
        <EuiLoadingElastic size="xxl" />
        <EuiSpacer size="m" />
        <EuiText>{label}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          onClick={closeFlyout}
          aria-label={i18n.translate('xpack.streams.streamFeaturesFlyout.stopButtonAriaLabel', {
            defaultMessage: 'Stop feature identification',
          })}
        >
          <FormattedMessage
            id="xpack.streams.streamFeaturesFlyout.stopButton"
            defaultMessage="Stop"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
