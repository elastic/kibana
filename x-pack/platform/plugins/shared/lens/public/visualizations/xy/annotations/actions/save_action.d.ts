import React from 'react';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { OnSaveProps as SavedObjectOnSaveProps } from '@kbn/saved-objects-plugin/public';
import type { EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import { type SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { LayerAction, LensAppServices, RegisterLibraryAnnotationGroupFunction, LensStartServices as StartServices, StateSetter } from '@kbn/lens-common';
import type { XYAnnotationLayerConfig, XYVisualizationState } from '../../types';
type ModalOnSaveProps = SavedObjectOnSaveProps & {
    newTags: string[];
    closeModal: () => void;
};
/** @internal exported for testing only */
export declare const SaveModal: ({ domElement, savedObjectsTagging, onSave, lastSavedTitle, title, description, tags, showCopyOnSave, eventAnnotationService, }: {
    domElement: HTMLDivElement;
    savedObjectsTagging: SavedObjectTaggingPluginStart | undefined;
    onSave: (props: ModalOnSaveProps) => Promise<void>;
    lastSavedTitle: string;
    title: string;
    description: string;
    tags: string[];
    showCopyOnSave: boolean;
    eventAnnotationService: LensAppServices["eventAnnotationService"];
}) => React.JSX.Element;
/** @internal exported for testing only */
export declare const onSave: ({ state, layer, setState, registerLibraryAnnotationGroup, eventAnnotationService, toasts, modalOnSaveProps: { newTitle, newDescription, newTags, closeModal, newCopyOnSave }, dataViews, goToAnnotationLibrary, startServices, }: {
    state: XYVisualizationState;
    layer: XYAnnotationLayerConfig;
    setState: StateSetter<XYVisualizationState, unknown>;
    registerLibraryAnnotationGroup: (props: {
        id: string;
        group: EventAnnotationGroupConfig;
    }) => void;
    eventAnnotationService: EventAnnotationServiceType;
    toasts: ToastsStart;
    modalOnSaveProps: ModalOnSaveProps;
    dataViews: DataViewsContract;
    goToAnnotationLibrary: () => Promise<void>;
    startServices: StartServices;
}) => Promise<void>;
export declare const getSaveLayerAction: ({ state, layer, setState, registerLibraryAnnotationGroup, eventAnnotationService, toasts, savedObjectsTagging, dataViews, goToAnnotationLibrary, startServices, }: {
    state: XYVisualizationState;
    layer: XYAnnotationLayerConfig;
    setState: StateSetter<XYVisualizationState, unknown>;
    registerLibraryAnnotationGroup: RegisterLibraryAnnotationGroupFunction;
    eventAnnotationService: EventAnnotationServiceType;
    toasts: ToastsStart;
    savedObjectsTagging?: SavedObjectTaggingPluginStart;
    dataViews: DataViewsContract;
    goToAnnotationLibrary: () => Promise<void>;
    startServices: StartServices;
}) => LayerAction;
export {};
