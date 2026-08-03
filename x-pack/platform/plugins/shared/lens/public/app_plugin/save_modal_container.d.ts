import React from 'react';
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { Reference } from '@kbn/content-management-utils';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { LensAppState, LensAppServices, LensDocument, VisualizeEditorContext } from '@kbn/lens-common';
import type { Simplify } from '@kbn/chart-expressions-common';
import type { LensAppProps } from './types';
import type { SaveProps } from './app';
type ExtraProps = Simplify<Pick<LensAppProps, 'initialInput'> & Partial<Pick<LensAppProps, 'redirectToOrigin' | 'redirectTo' | 'onAppLeave'>>>;
export type SaveModalContainerProps = {
    originatingApp?: string;
    getOriginatingPath?: (dashboardId: string) => string;
    persistedDoc?: LensDocument;
    lastKnownDoc?: LensDocument;
    /**
     * Used if you want to carry to the save modal the state of the controls
     * (e.g. your Lens visualization is controlled by a UI control and you want to
     * transfer the control state)
     */
    controlsState?: ControlPanelsState;
    returnToOriginSwitchLabel?: string;
    onClose: () => void;
    onSave?: (saveProps: SaveProps) => void;
    runSave?: (saveProps: SaveProps, options: {
        saveToLibrary: boolean;
    }) => void;
    isSaveable?: boolean;
    getAppNameFromId?: () => string | undefined;
    lensServices: Pick<LensAppServices, 'attributeService' | 'savedObjectsTagging' | 'application' | 'notifications' | 'http' | 'chrome' | 'overlays' | 'analytics' | 'i18n' | 'theme' | 'userProfile' | 'stateTransfer' | 'lensDocumentService'>;
    initialContext?: VisualizeFieldContext | VisualizeEditorContext;
    managed?: boolean;
} & ExtraProps;
export declare function SaveModalContainer({ returnToOriginSwitchLabel, onClose, onSave, runSave, persistedDoc, originatingApp, getOriginatingPath, initialInput, redirectTo, redirectToOrigin, getAppNameFromId, isSaveable, lastKnownDoc: initLastKnownDoc, lensServices, initialContext, managed, controlsState, }: SaveModalContainerProps): React.JSX.Element;
export type SaveVisualizationProps = Simplify<{
    lastKnownDoc?: LensDocument;
    persistedDoc?: LensDocument;
    originatingApp?: string;
    getOriginatingPath?: (dashboardId: string) => string;
    textBasedLanguageSave?: boolean;
    switchDatasource?: () => void;
    controlsState?: ControlPanelsState;
} & ExtraProps & Pick<LensAppServices, 'application' | 'chrome' | 'overlays' | 'analytics' | 'i18n' | 'theme' | 'userProfile' | 'notifications' | 'stateTransfer' | 'attributeService' | 'savedObjectsTagging'>>;
export declare const runSaveLensVisualization: (props: SaveVisualizationProps, saveProps: SaveProps, options: {
    saveToLibrary: boolean;
}) => Promise<Partial<LensAppState> | undefined>;
export declare function removePinnedFilters(doc?: LensDocument): {
    state: {
        filters: import("@kbn/es-query").Filter[];
        datasourceStates: Record<string, unknown>;
        visualization: unknown;
        query: import("@kbn/es-query").Query | import("@kbn/es-query").AggregateQuery;
        globalPalette?: {
            activePaletteId: string;
            state?: unknown;
        };
        needsRefresh?: boolean;
        adHocDataViews?: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec>;
        internalReferences?: Reference[];
    };
    savedObjectId?: string;
    title: string;
    description?: string;
    visualizationType: string | null;
    references: Reference[];
    version?: import("@kbn/lens-common/content_management/constants").LENS_ITEM_LATEST_VERSION;
} | undefined;
export default SaveModalContainer;
