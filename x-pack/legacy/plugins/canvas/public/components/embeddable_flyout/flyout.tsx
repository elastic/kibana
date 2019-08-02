/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  SavedObjectFinder,
  SavedObjectMetaData,
} from 'ui/saved_objects/components/saved_object_finder';

import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody, EuiTitle } from '@elastic/eui';
import { embeddableFactories } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/index';

export interface Props {
  onClose: () => void;
  onSelect: (id: string, embeddableType: string) => void;
  availableEmbeddables: string[];
}

export class AddEmbeddableFlyout extends React.Component<Props> {
  onAddPanel = (id: string, savedObjectType: string, name: string) => {
    // Find the embeddable type from the saved object type
    const found = Array.from(embeddableFactories.entries()).find(([_key, embeddableFactory]) => {
      return Boolean(
        embeddableFactory.savedObjectMetaData &&
          embeddableFactory.savedObjectMetaData.type === savedObjectType
      );
    });

    const foundEmbeddableType = found ? found[0] : 'unknown';

    this.props.onSelect(id, foundEmbeddableType);
  };

  render() {
    const availableSavedObjects = Array.from(embeddableFactories.entries())
      .filter(([key]) => {
        return this.props.availableEmbeddables.includes(key);
      })
      .map(([_key, { savedObjectMetaData }]) => savedObjectMetaData)
      .filter<SavedObjectMetaData<{}>>(function(
        maybeSavedObjectMetaData
      ): maybeSavedObjectMetaData is SavedObjectMetaData<{}> {
        return maybeSavedObjectMetaData !== undefined;
      });

    return (
      <EuiFlyout ownFocus onClose={this.props.onClose} data-test-subj="dashboardAddPanel">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage id="xpack.canvas.embedObject.title" defaultMessage="Embed Object" />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <SavedObjectFinder
            onChoose={this.onAddPanel}
            savedObjectMetaData={availableSavedObjects}
            showFilter={true}
            noItemsMessage={i18n.translate('xpack.canvas.embedObject.noMatchingObjectsMessage', {
              defaultMessage: 'No matching objects found.',
            })}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
}
