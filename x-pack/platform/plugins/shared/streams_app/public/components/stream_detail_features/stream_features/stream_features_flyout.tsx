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
  EuiTitle,
} from '@elastic/eui';
import type { Streams, System } from '@kbn/streams-schema';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamFeaturesApi } from '../../../hooks/use_stream_features_api';
import { StreamFeaturesTable } from './stream_features_table';

export const StreamFeaturesFlyout = ({
  definition,
  features,
  setFeatures,
  closeFlyout,
  onFeaturesAdded,
  onFeaturesDiscarded,
}: {
  definition: Streams.all.Definition;
  features: System[];
  setFeatures: React.Dispatch<React.SetStateAction<System[]>>;
  closeFlyout: () => void;
  onFeaturesAdded: () => void;
  onFeaturesDiscarded: () => void;
}) => {
  const {
    core: { notifications },
  } = useKibana();

  const [selectedFeatureNames, setSelectedFeatureNames] = useState<Set<string>>(new Set());
  const { addSystemsToStream } = useStreamFeaturesApi(definition);
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
        <StreamFeaturesTable
          features={features}
          selectedFeatureNames={selectedFeatureNames}
          setSelectedFeatureNames={setSelectedFeatureNames}
          definition={definition}
          setFeatures={setFeatures}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              isDisabled={isUpdating}
              onClick={closeFlyout}
              flush="left"
              aria-label={i18n.translate(
                'xpack.streams.streamFeaturesFlyout.closeButtonAriaLabel',
                {
                  defaultMessage: 'Close flyout',
                }
              )}
              data-test-subj="feature_identification_close_flyout_button"
            >
              <FormattedMessage
                id="xpack.streams.streamFeaturesFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiButtonEmpty
                  onClick={() => {
                    onFeaturesDiscarded();
                  }}
                >
                  <FormattedMessage
                    id="xpack.streams.streamFeaturesFlyout.discardButton"
                    defaultMessage="Discard"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  isLoading={isUpdating}
                  onClick={() => {
                    setIsUpdating(true);
                    addSystemsToStream(selectedFeatures).finally(() => {
                      notifications.toasts.addSuccess({
                        title: i18n.translate(
                          'xpack.streams.streamFeaturesFlyout.addFeaturesSuccessToastTitle',
                          {
                            defaultMessage:
                              '{count} {count, plural, one {feature} other {features}} added to stream',
                            values: { count: selectedFeatures.length },
                          }
                        ),
                      });
                      onFeaturesAdded();
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
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
