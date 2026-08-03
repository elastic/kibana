import type { ReduxDispatchProps, ReduxStateProps, OwnProps } from './feature_edit_tools';
import { FeatureEditTools } from './feature_edit_tools';
declare const connectedFeatureEditControl: import("react-redux-v7").ConnectedComponent<typeof FeatureEditTools, import("react-redux-v7").Omit<ReduxStateProps & ReduxDispatchProps & OwnProps, "drawShape" | "setDrawShape"> & OwnProps>;
export { connectedFeatureEditControl as FeatureEditTools };
