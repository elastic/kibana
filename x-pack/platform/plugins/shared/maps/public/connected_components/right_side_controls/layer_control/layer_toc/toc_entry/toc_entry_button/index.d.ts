import type { ReduxStateProps, OwnProps } from './toc_entry_button';
import { TOCEntryButton } from './toc_entry_button';
declare const connected: import("react-redux").ConnectedComponent<typeof TOCEntryButton, import("react-redux").Omit<import("react").ClassAttributes<TOCEntryButton> & ReduxStateProps & OwnProps, "zoom" | "inspectorAdapters" | "isUsingSearch"> & OwnProps>;
export { connected as TOCEntryButton };
