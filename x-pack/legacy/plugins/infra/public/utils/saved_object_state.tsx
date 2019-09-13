/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

interface SavedObjectStateContainerProps<SavedObjectState> {
  savedObjectState: SavedObjectState | undefined;
  savedObjectStateKey: string;
  mapToSavedObjectState?: (value: any) => SavedObjectState | undefined;
  onChange?: (state: SavedObjectState, previousUrlState: SavedObjectState | undefined) => void;
  onInitialize?: (state: SavedObjectState | undefined) => void;
}

class SavedObjectWrapper<SavedObjectState> extends React.Component<SavedObjectState> {
  public render() {
    return null;
  }

  public componentDidMount() {
    this.handleInitialize();
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering this is really a method despite what eslint thinks
  private save = (attributes: SavedObjectState | undefined) => {
    // TODO implement save
  };

  private handleInitialize = () => {};
}

export const SavedObjectStateContainer = <UrlState extends any>(
  props: SavedObjectStateContainerProps<UrlState>
) => <SavedObjectWrapper />;
