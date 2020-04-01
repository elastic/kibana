/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MapStoreState } from '../../../../../plugins/maps/public/reducers/store';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FLYOUT_STATE, INDEXING_STAGE } from '../../../../../plugins/maps/public/reducers/ui';

export const getFlyoutDisplay = ({ ui }: MapStoreState): FLYOUT_STATE => ui.flyoutDisplay;
export const getIsSetViewOpen = ({ ui }: MapStoreState): boolean => ui.isSetViewOpen;
export const getIsLayerTOCOpen = ({ ui }: MapStoreState): boolean => ui.isLayerTOCOpen;
export const getOpenTOCDetails = ({ ui }: MapStoreState): string[] => ui.openTOCDetails;
export const getIsFullScreen = ({ ui }: MapStoreState): boolean => ui.isFullScreen;
export const getIsReadOnly = ({ ui }: MapStoreState): boolean => ui.isReadOnly;
export const getIndexingStage = ({ ui }: MapStoreState): INDEXING_STAGE | null =>
  ui.importIndexingStage;
