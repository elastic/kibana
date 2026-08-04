import React, { type ReactNode } from 'react';
import type { VisualizationMap, DatasourceMap } from '@kbn/lens-common';
export interface EditorFrameServiceValue {
    visualizationMap: VisualizationMap;
    datasourceMap: DatasourceMap;
}
export interface EditorFrameServiceProviderProps extends EditorFrameServiceValue {
    children?: ReactNode;
}
/**
 * Provider component that makes visualizationMap and datasourceMap available
 * throughout the component tree via React context.
 *
 * This provides the same values returned by plugin.initEditorFrameService().
 *
 * This should be added at the root of:
 * - Full-page Lens editor
 * - Inline edit configuration flyout
 * - Embeddable component
 */
export declare function EditorFrameServiceProvider({ visualizationMap, datasourceMap, children, }: EditorFrameServiceProviderProps): React.JSX.Element;
/**
 * Hook to access visualizationMap and datasourceMap from context.
 *
 * Returns the same values as plugin.initEditorFrameService().
 *
 * @throws Error if used outside of EditorFrameServiceProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { visualizationMap, datasourceMap } = useEditorFrameService();
 *   const activeViz = visualizationMap[activeId];
 *   // ...
 * }
 * ```
 */
export declare function useEditorFrameService(): EditorFrameServiceValue;
