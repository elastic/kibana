/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  SavedObjectFinder,
  SavedObjectMetaData,
} from 'ui/saved_objects/components/saved_object_finder';
import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody, EuiTitle } from '@elastic/eui';
import { start } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import { ComponentStrings } from '../../../i18n';

const { AddEmbeddableFlyout: strings } = ComponentStrings;

export interface Props {
  onClose: () => void;
  onSelect: (id: string, embeddableType: string) => void;
  availableEmbeddables: string[];
}

export class AddEmbeddableFlyout extends React.Component<Props> {
  onAddPanel = (id: string, savedObjectType: string, name: string) => {
    const embeddableFactories = start.getEmbeddableFactories();

    // Find the embeddable type from the saved object type
    const found = Array.from(embeddableFactories).find(embeddableFactory => {
      return Boolean(
        embeddableFactory.savedObjectMetaData &&
          embeddableFactory.savedObjectMetaData.type === savedObjectType
      );
    });

    const foundEmbeddableType = found ? found.type : 'unknown';

    this.props.onSelect(id, foundEmbeddableType);
  };

  render() {
    const embeddableFactories = start.getEmbeddableFactories();

    const availableSavedObjects = Array.from(embeddableFactories)
      .filter(factory => {
        return this.props.availableEmbeddables.includes(factory.type);
      })
      .map(factory => factory.savedObjectMetaData)
      .filter<SavedObjectMetaData<{}>>(function(
        maybeSavedObjectMetaData
      ): maybeSavedObjectMetaData is SavedObjectMetaData<{}> {
        return maybeSavedObjectMetaData !== undefined;
      });

    return (
      <EuiFlyout ownFocus onClose={this.props.onClose} data-test-subj="dashboardAddPanel">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>{strings.getTitleText()}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <SavedObjectFinder
            onChoose={this.onAddPanel}
            savedObjectMetaData={availableSavedObjects}
            showFilter={true}
            noItemsMessage={strings.getNoItemsText()}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
}
