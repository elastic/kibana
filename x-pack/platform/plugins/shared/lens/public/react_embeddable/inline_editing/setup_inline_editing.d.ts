import { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import React from 'react';
import type { GetStateType, LensInspectorAdapters, LensInternalApi, LensRuntimeState } from '@kbn/lens-common';
import type { EditConfigPanelProps } from '../../app_plugin/shared/edit_on_the_fly/types';
import type { PanelManagementApi } from './panel_management';
import type { LensEmbeddableStartServices } from '../types';
export declare function prepareInlineEditPanel(initialState: LensRuntimeState, getState: GetStateType, updateState: (newState: Pick<LensRuntimeState, 'attributes' | 'ref_id'>) => void, { dataLoading$, isNewlyCreated$ }: Pick<LensInternalApi, 'dataLoading$' | 'isNewlyCreated$'>, panelManagementApi: PanelManagementApi, inspectorApi: LensInspectorAdapters, { coreStart, visualizationMap, datasourceMap, ...startDependencies }: Omit<LensEmbeddableStartServices, 'timefilter' | 'coreHttp' | 'capabilities' | 'expressionRenderer' | 'documentToExpression' | 'injectFilterReferences' | 'theme' | 'uiSettings' | 'attributeService'>, navigateToLensEditor?: (stateTransfer: EmbeddableStateTransfer, skipAppLeave?: boolean) => () => Promise<void>, uuid?: string, parentApi?: unknown): ({ closeFlyout, onApply, onCancel, applyButtonLabel, }?: Partial<Pick<EditConfigPanelProps, "closeFlyout" | "onApply" | "onCancel" | "applyButtonLabel">>) => Promise<React.JSX.Element | null>;
