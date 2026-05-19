import type { CoreStart, IUiSettingsClient } from '@kbn/core/public';
import React from 'react';
import type { Simplify } from '@kbn/chart-expressions-common';
import type { LayerPanelProps } from './types';
export type ESQLEditorProps = Simplify<{
    isTextBasedLanguage: boolean;
    uiSettings: IUiSettingsClient;
    http: CoreStart['http'];
} & Pick<LayerPanelProps, 'attributes' | 'framePublicAPI' | 'lensAdapters' | 'parentApi' | 'layerId' | 'panelId' | 'closeFlyout' | 'data' | 'editorContainer' | 'setCurrentAttributes' | 'updateSuggestion' | 'dataLoading$' | 'parentApi' | 'onTextBasedQueryStateChange'>>;
/**
 * This is a wrapper around the Monaco ESQL editor for Lens
 * It handles its internal state and update both attributes & activeData on changes
 * in the Redux store.
 * Mind that this component will render either inline (classic React)
 * or in a portal if the editorContainer props is provided
 */
export declare function ESQLEditor({ data, http, uiSettings, attributes, framePublicAPI, isTextBasedLanguage, lensAdapters, parentApi, panelId, layerId, closeFlyout, editorContainer, dataLoading$, setCurrentAttributes, updateSuggestion, onTextBasedQueryStateChange, }: ESQLEditorProps): React.JSX.Element | null;
