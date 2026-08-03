import React from 'react';
import { DRAW_SHAPE } from '../../../../../common/constants';
export interface ReduxStateProps {
    drawShape?: string;
}
export interface ReduxDispatchProps {
    setDrawShape: (shapeToDraw: DRAW_SHAPE | null) => void;
}
export interface OwnProps {
    pointsOnly?: boolean;
}
type Props = ReduxStateProps & ReduxDispatchProps & OwnProps;
export declare function FeatureEditTools(props: Props): React.JSX.Element;
export {};
