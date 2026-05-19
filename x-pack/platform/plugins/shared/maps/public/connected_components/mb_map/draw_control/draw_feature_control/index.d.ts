import type { ReduxDispatchProps, ReduxStateProps, OwnProps } from './draw_feature_control';
import { DrawFeatureControl } from './draw_feature_control';
declare const connected: import("react-redux").ConnectedComponent<typeof DrawFeatureControl, import("react-redux").Omit<import("react").ClassAttributes<DrawFeatureControl> & ReduxStateProps & ReduxDispatchProps & OwnProps, "drawMode" | "drawShape" | "editLayer" | "addNewFeatureToIndex" | "deleteFeatureFromIndex"> & OwnProps>;
export { connected as DrawFeatureControl };
