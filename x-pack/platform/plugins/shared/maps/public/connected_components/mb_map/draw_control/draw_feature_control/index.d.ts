import type { ReduxDispatchProps, ReduxStateProps, OwnProps } from './draw_feature_control';
import { DrawFeatureControl } from './draw_feature_control';
declare const connected: import("react-redux-v7").ConnectedComponent<typeof DrawFeatureControl, import("react-redux-v7").Omit<import("react").ClassAttributes<DrawFeatureControl> & ReduxStateProps & ReduxDispatchProps & OwnProps, "drawMode" | "drawShape" | "editLayer" | "addNewFeatureToIndex" | "deleteFeatureFromIndex"> & OwnProps>;
export { connected as DrawFeatureControl };
