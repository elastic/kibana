import type { OwnProps, ReduxDispatchProps, ReduxStateProps } from './toc_entry';
import { TOCEntry } from './toc_entry';
declare const connected: import("react-redux").ConnectedComponent<typeof TOCEntry, import("react-redux").Omit<import("react").ClassAttributes<TOCEntry> & ReduxStateProps & ReduxDispatchProps & OwnProps, "zoom" | "inspectorAdapters" | "isReadOnly" | "isFeatureEditorOpenForLayer" | "fitToBounds" | "selectedLayer" | "isEditButtonDisabled" | "toggleVisible" | "hasDirtyStateSelector" | "isLegendDetailsOpen" | "openLayerPanel" | "hideTOCDetails" | "showTOCDetails" | "cancelEditing"> & OwnProps>;
export { connected as TOCEntry };
