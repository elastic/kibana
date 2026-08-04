import type { OwnProps, ReduxDispatchProps, ReduxStateProps } from './toc_entry';
import { TOCEntry } from './toc_entry';
declare const connected: import("react-redux-v7").ConnectedComponent<typeof TOCEntry, import("react-redux-v7").Omit<import("react").ClassAttributes<TOCEntry> & ReduxStateProps & ReduxDispatchProps & OwnProps, "inspectorAdapters" | "zoom" | "isReadOnly" | "isFeatureEditorOpenForLayer" | "fitToBounds" | "selectedLayer" | "isEditButtonDisabled" | "toggleVisible" | "hasDirtyStateSelector" | "isLegendDetailsOpen" | "openLayerPanel" | "hideTOCDetails" | "showTOCDetails" | "cancelEditing"> & OwnProps>;
export { connected as TOCEntry };
