import React from 'react';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type { ExtraAppendLayerArg } from './visualization';
export declare function LoadAnnotationLibraryFlyout({ eventAnnotationService, isLoadLibraryVisible, setLoadLibraryFlyoutVisible, addLayer, isInlineEditing, }: {
    isLoadLibraryVisible: boolean;
    setLoadLibraryFlyoutVisible: (visible: boolean) => void;
    eventAnnotationService: EventAnnotationServiceType;
    addLayer: (argument?: ExtraAppendLayerArg) => void;
    isInlineEditing?: boolean;
}): React.JSX.Element;
